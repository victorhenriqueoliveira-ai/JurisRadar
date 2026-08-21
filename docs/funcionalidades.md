# JurisRadar — Documentação das Funcionalidades

## 1. Busca de Processos (DataJud)

### O que é

A aba **Buscar Processos** consulta o **DataJud**, a base nacional de dados processuais do CNJ (Conselho Nacional de Justiça). Ela reúne informações de todos os tribunais do país que enviam dados à plataforma, incluindo o TJSP.

### Como usar

| Campo | O que informar | Exemplo |
|-------|----------------|---------|
| **Número do processo** | Número CNJ completo, com ou sem pontuação | `1501260-42.2024.8.26.0052` |
| **Palavra-chave** | Assunto/classe processual no vocabulário CNJ | `Alimentos`, `Divórcio`, `Indenização` |
| **Instância** | Grau do processo | 1ª Instância, 2ª Instância, Juizados Especiais |
| **Comarca / Cidade** | Nome da vara ou comarca | `Campinas`, `Santos` |
| **Datas de distribuição** | Intervalo de ajuizamento do processo | De 01/01/2024 até 31/12/2024 |

**Regra importante:** quando o campo "Número do processo" está preenchido, todos os outros filtros são ignorados automaticamente. A busca usa só o número.

### Como a busca funciona por baixo

- A plataforma envia uma query **Elasticsearch** para a API pública do DataJud (`api-publica.datajud.cnj.jus.br`).
- Para **número de processo**: usa `match_phrase` no campo `numeroProcesso`. Antes de enviar, remove pontos e traços — o DataJud armazena o número sem formatação (ex.: `150126042202482600520`).
- Para **palavra-chave**: usa `multi_match` nos campos `assuntos.nome`, `classe.nome` e `orgaoJulgador.nome`.
- Para **comarca**: usa `match` em `orgaoJulgador.nome`.
- Para **datas**: usa `range` no campo `dataAjuizamento` (formato `yyyyMMddHHmmss`).

### Por que as datas não são em tempo real

O DataJud **não é atualizado em tempo real**. O CNJ coleta os dados dos tribunais em lotes periódicos, e cada tribunal envia com seu próprio ritmo. Na prática:

- Dados de **2023 e 2024** têm cobertura robusta.
- Dados de **início de 2025** têm cobertura parcial.
- Dados **muito recentes** (semanas anteriores) podem ainda não ter chegado ao índice.

O atraso típico varia de **dias a semanas**, dependendo do tribunal e do volume de processos.

### Quando será em tempo real

O DataJud não oferece uma API de eventos em tempo real — é uma base de consulta batch. Para ter dados mais frescos, seria necessário:

1. Monitorar o endpoint de atualizações do CNJ (quando disponível por tribunal).
2. Ou criar um crawler próprio que acesse o portal do TJSP diariamente.

Por enquanto, a melhor estratégia para processos muito recentes é usar o link **"Consultar no TJSP"** disponível em cada card de resultado, que redireciona para o eSAJ em tempo real.

### Limite de resultados

O DataJud limita a **10.000 documentos** por índice de tribunal via Elasticsearch. O JurisRadar exibe 20 por página e navega via paginação. Se uma busca retornar mais de 10.000, apenas os primeiros 10.000 são acessíveis — adicionar filtros (comarca, datas, instância) reduz o conjunto e torna a busca mais precisa.

### O que aparece em cada processo

- Número CNJ e link para o TJSP
- Órgão julgador, assunto, classe processual, data de distribuição
- Última movimentação
- **"Ver mais"**: histórico completo de movimentações, polo ativo/passivo com nomes e OAB dos advogados, assuntos adicionais

> Partes e advogados só aparecem quando o TJSP preencheu esse campo no envio ao CNJ. Nem todos os processos têm essa informação disponível.

---

## 2. Publicações DJE (Diário da Justiça Eletrônico)

### O que é

A aba **Publicações DJE** busca dentro de um índice local de publicações extraídas do **DJE/TJSP** — o Diário da Justiça Eletrônico do Tribunal de Justiça de São Paulo. Ao contrário do DataJud (que consulta uma API externa), essa funcionalidade opera sobre dados **já indexados no banco de dados do JurisRadar**.

### Como usar

| Campo | O que informar | Exemplo |
|-------|----------------|---------|
| **Termo de busca** | Qualquer palavra que possa aparecer no texto da publicação | `rescisão contratual`, `nome da parte`, `número do processo` |
| **Data inicial** | Início do período de publicação no DJE | `01/01/2025` |
| **Data final** | Fim do período de publicação no DJE | `31/07/2025` |

A busca é feita por **full-text search** com PostgreSQL (`tsvector`/`tsquery`), e os resultados mostram trechos com os termos destacados.

### Como a indexação funciona

O JurisRadar roda um **job automático diário** (via Inngest) que executa o seguinte pipeline toda segunda a sexta às **20h (horário de Brasília)**:

```
DJE/TJSP Portal
      ↓
Download do PDF (Caderno 2 e Caderno 3)
      ↓
Extração de texto do PDF (pdf-parse)
      ↓
Segmentação por número CNJ (regex)
      ↓
Persistência no banco (PostgreSQL)
      ↓
Disponível na busca do JurisRadar
```

**Cadernos indexados:**

| Caderno | Conteúdo |
|---------|----------|
| Caderno 2 | Judicial — 2ª Instância |
| Caderno 3 | Judicial — 1ª Instância Capital (Parte I) |

> Interior do estado e outros tribunais **não** são cobertos nesta versão.

### Por que as datas não são em tempo real

O DJE é publicado pelo TJSP uma vez por dia útil, geralmente no final da tarde. O job do JurisRadar baixa e indexa o diário às **20h BRT** para garantir que a edição do dia já esteja disponível no portal.

Isso significa:

- Uma publicação do **dia de hoje** estará disponível no JurisRadar a partir das **~20h30**.
- Publicações de **fins de semana e feriados** não existem (o DJE não é publicado nesses dias).
- Se o job falhar (portal fora do ar, PDF corrompido), a edição do dia ficará ausente até a próxima execução.

### Quando será em tempo real

O TJSP publica o DJE em horário fixo, não há feed de eventos em tempo real. Para minimizar o atraso:

- O job poderia ser executado **múltiplas vezes ao dia** (ex.: 18h, 19h, 20h) como tentativas antecipadas.
- Seria possível monitorar o portal do DJE por disponibilidade da edição e disparar a indexação assim que o PDF aparecer.

Essas melhorias são implementáveis com ajuste no cron e adição de lógica de verificação — o sistema já tem idempotência (não reprocessa edições já indexadas).

### Cobertura histórica

Só há publicações indexadas a partir da data em que o JurisRadar começou a rodar o job. Não há retroativo automático de datas anteriores. Para indexar períodos históricos, seria necessário executar o pipeline manualmente para cada data desejada.

### O que aparece em cada publicação

- Número do processo (formato CNJ)
- Vara ou Câmara responsável
- Data de publicação no DJE
- Instância (1ª ou 2ª)
- Trecho do conteúdo com o termo de busca destacado

---

## Comparativo rápido

| | Busca de Processos (DataJud) | Publicações DJE |
|--|------------------------------|-----------------|
| **Fonte** | API pública do CNJ | Banco local (indexado diariamente) |
| **Cobertura** | Todos os tribunais do Brasil | TJSP — Cadernos 2 e 3 (Capital) |
| **Atualização** | Dias a semanas (batch CNJ) | Diária às 20h BRT (dias úteis) |
| **Tipo de busca** | Elasticsearch (assunto, número, comarca) | Full-text PostgreSQL (texto livre) |
| **Dados disponíveis** | Movimentações, partes, advogados, classe | Texto completo da publicação no diário |
| **Tempo real** | Não | Não (delay de horas no mesmo dia) |
| **Uso ideal** | Encontrar processos por assunto ou número | Monitorar publicações por nome/termo |
