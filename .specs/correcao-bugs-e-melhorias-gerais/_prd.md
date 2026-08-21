# PRD — Correção de Bugs Críticos e Melhorias Gerais do JurisRadar

## Visão Geral

O JurisRadar possui um conjunto de funcionalidades centrais — onboarding, calendário processual, CRM, sincronização OAB e busca DJEN — que estão parcialmente quebradas ou com comportamento incorreto, impedindo que advogados e escritórios usem o produto de forma confiável no dia a dia.

Este PRD cobre a correção dos bugs identificados e a introdução de melhorias pontuais de usabilidade e performance, sem reescrever módulos inteiros. O foco é restaurar a confiança do usuário no produto e garantir que todos os fluxos críticos funcionem de ponta a ponta.

**Para quem:** Advogados e escritórios de advocacia que usam o JurisRadar para monitorar processos, gerenciar prazos e consultar diários da justiça.

**Por que agora:** Bugs em fluxos centrais (criação de evento, filtros de CRM, onboarding) aumentam abandono e reduzem retenção — são barreiras diretas à adoção.

---

## Objetivos

- **Zero "Erro interno" genérico:** Toda falha exibida ao usuário deve ter mensagem descritiva e acionável.
- **Filtros e ordenação do CRM 100% funcionais:** Parâmetros enviados pelo frontend devem ser respeitados pelos dados retornados.
- **Onboarding sem travamento:** Taxa de conclusão do onboarding deve aumentar — usuários não devem ficar presos na etapa de apresentação.
- **Dashboard atualizado automaticamente após sync OAB:** Dados novos aparecem em até 30s sem ação do usuário.
- **Busca DJEN relevante:** Resultados retornam apenas publicações que contêm o termo buscado no corpo do texto.
- **Rotas perceptivelmente mais rápidas:** Redução subjetiva de lentidão ao navegar entre páginas do sistema.

---

## Histórias de Usuário

### Advogado — usuário principal

- Como advogado no onboarding, quero que a apresentação do produto avance normalmente ao clicar em "Próximo", para que eu consiga completar o cadastro sem precisar recarregar a página.
- Como advogado, quero criar eventos no calendário processual sem ver "Erro interno", para que eu possa registrar audiências e prazos com segurança.
- Como advogado, quero que os filtros do CRM realmente filtrem os processos exibidos, para que eu consiga encontrar rapidamente o que preciso.
- Como advogado, quero ordenar a tabela do CRM por qualquer coluna, para que eu possa priorizar processos por data, status ou urgência.
- Como advogado, quero que meus processos apareçam no dashboard automaticamente após a sincronização OAB, para que eu não precise recarregar a página manualmente.
- Como advogado, quero um botão para acionar a sincronização OAB quando quiser, para que eu possa forçar uma atualização imediata quando necessário.
- Como advogado, quero acessar diretamente a publicação de um processo no DJEN Nacional pelo CRM, para que eu possa verificar o conteúdo sem precisar abrir outra aba e buscar manualmente.
- Como advogado, quero que a busca DJEN traga apenas publicações que realmente contenham o termo que digitei, para que eu não perca tempo lendo resultados irrelevantes.

### Gestor do escritório — persona secundária

- Como gestor, quero que a sincronização OAB rode automaticamente a cada 5 horas, para que o escritório tenha dados sempre atualizados sem depender de ação manual.

---

## Features Principais

### 1. Correção do Onboarding — Desbloqueio do Fluxo de Apresentação *(P0)*

A etapa de apresentação do produto no onboarding trava ao tentar avançar. A causa identificada é a chamada síncrona à API de importação OAB durante o Passo 2, que bloqueia a UI enquanto aguarda resposta.

- A chamada de importação deve ser desacoplada da navegação entre passos — o usuário deve conseguir avançar independentemente do status da importação.
- Exibir feedback de progresso (spinner ou barra) enquanto a importação estiver em andamento, sem bloquear o botão "Próximo".
- Caso a importação falhe, exibir mensagem descritiva (não "Erro interno") e permitir que o usuário tente novamente ou pule para o próximo passo.

### 2. Correção do Calendário — Criação de Evento sem Erro Interno *(P0)*

Ao criar um novo evento, o formulário retorna "Erro interno" após clicar em "Salvar".

- Identificar e corrigir a causa raiz do erro 500 na API de criação de eventos.
- Substituir a mensagem genérica "Erro interno" por mensagens descritivas para cada tipo de falha possível (campo inválido, conflito de horário, falha de permissão, etc.).
- O formulário deve manter os dados preenchidos após um erro, para que o usuário não precise redigitá-los.

### 3. Correção do CRM — Filtros Funcionais *(P0)*

Os filtros de status, área, tribunal e urgência são exibidos na interface mas não afetam os processos listados.

- Os parâmetros de filtragem enviados pelo frontend (incluindo urgência) devem ser aplicados na consulta ao banco de dados.
- Filtros ativos devem ter indicador visual (chip ou badge) confirmando que estão aplicados.
- A lista de processos deve atualizar imediatamente ao aplicar ou remover um filtro.

### 4. Correção do CRM — Ordenação por Coluna *(P0)*

Clicar nos cabeçalhos da tabela do CRM não altera a ordem dos processos exibidos.

- A ordenação selecionada (coluna + direção asc/desc) deve ser aplicada na consulta retornada.
- O cabeçalho da coluna ativa deve exibir indicador visual de direção (seta para cima/baixo).
- A ordenação deve persistir enquanto o usuário navega entre páginas da tabela.

### 5. Sincronização OAB — Dashboard com Auto-refresh e Botão Manual *(P1)*

Após o sync OAB, os processos importados não aparecem automaticamente no dashboard.

- O dashboard deve atualizar seus dados automaticamente a cada 30 segundos enquanto o usuário estiver com a aba em foco (polling leve).
- Adicionar botão "Sincronizar agora" visível no dashboard e/ou na área de configurações OAB.
- O botão deve exibir estado de carregamento durante o sync e mostrar data/hora do último sync concluído.
- O agendamento automático do Inngest deve ser ajustado para rodar a cada 5 horas (atualmente roda diariamente).

### 6. CRM — Botão "Ver no DJEN" por Processo *(P1)*

Não existe atalho para acessar a publicação de um processo no DJEN Nacional diretamente pelo CRM.

- Adicionar botão ou link "Ver no DJEN" em cada linha ou card de processo no CRM.
- Ao clicar, abrir nova aba com a busca do DJEN Nacional pré-preenchida com o número do processo.
- O link deve funcionar para qualquer processo, independentemente do tribunal de origem.

### 7. Correção da Busca DJEN — Relevância do Termo Principal *(P1)*

A busca retorna publicações que não contêm o termo digitado no campo "Busca principal" no corpo do texto (ex.: buscar "capão redondo" traz resultados de Guarujá).

- O termo do campo "Busca principal" deve ser aplicado como filtro obrigatório (AND) no conteúdo textual da publicação.
- Resultados onde o termo não aparece no corpo do texto não devem ser exibidos.
- Caso a API externa não suporte full-text match exato, aplicar pós-filtragem no backend antes de retornar ao frontend.
- Exibir aviso quando nenhum resultado contiver o termo no corpo, orientando o usuário a refinar a busca.

### 8. Performance — Carregamento de Rotas Mais Rápido *(P2)*

A navegação entre páginas do sistema é percebida como lenta.

- Aplicar estratégia de cache nas rotas de maior acesso (dashboard, CRM, calendário) para reduzir tempo de carregamento percebido.
- Rotas que exibem estado de carregamento (`loading.js`) devem fazê-lo de forma consistente, evitando tela em branco.
- A melhoria deve ser perceptível ao usuário sem necessidade de benchmark — a navegação deve parecer mais fluida.

---

## Experiência do Usuário

### Onboarding
O usuário completa os 3 passos sem travar. Se a importação OAB demorar, ele vê um indicador de progresso mas pode continuar navegando. Erros são explicados com clareza e oferecem opção de tentar novamente.

### Calendário
O usuário preenche o formulário de novo evento, clica em "Salvar" e o evento aparece no calendário imediatamente. Em caso de erro, a mensagem diz exatamente o que está errado (ex.: "A data informada é inválida" ou "Título obrigatório") e o formulário mantém os dados preenchidos.

### CRM
O usuário filtra processos por status "Em andamento" + urgência "Alta" e vê imediatamente apenas os processos que atendem aos dois critérios. Chips de filtro ativos ficam visíveis no topo da tabela. Ao clicar em "Data" no cabeçalho, a lista ordena por data e uma seta indica a direção. Cada linha tem um ícone "Ver no DJEN" que abre a busca em nova aba.

### Dashboard + Sync OAB
O usuário acessa o dashboard após o sync automático das 5h e vê os novos processos sem precisar recarregar. Quando quer forçar atualização, clica em "Sincronizar agora", vê o botão em loading e, ao terminar, o timestamp "Última sincronização: 21/08/2026 às 14:32" atualiza.

### Busca DJEN
O usuário digita "capão redondo" no campo de busca principal e vê apenas publicações que realmente mencionam o bairro no texto. Se a busca retornar vazio, uma mensagem sugere ampliar os termos ou verificar a data selecionada.

---

## Restrições Técnicas de Alto Nível

- As correções devem ser cirúrgicas — nenhum módulo inteiro deve ser reescrito.
- O agendamento automático de sync deve usar o Inngest, já presente no projeto.
- O link "Ver no DJEN" deve usar a URL da busca do DJEN Nacional (API `comunicaapi.pje.jus.br`) como base.
- A pós-filtragem da busca DJEN deve ser aplicada antes de retornar ao frontend, sem alterar o contrato da API externa.
- O polling do dashboard deve pausar quando a aba perder foco para não gerar requisições desnecessárias.

---

## Não-Objetivos (Fora de Escopo)

- Redesign visual de qualquer componente — apenas correções funcionais e indicadores de estado.
- Implementação de SSE ou WebSockets para atualização em tempo real do dashboard.
- Busca DJEN com operadores booleanos avançados (AND/OR/NOT) ou sugestão de termos — apenas correção da relevância básica.
- Novo sistema de notificações push para fim de sync.
- Migração de qualquer componente para nova biblioteca ou framework.
- Importação OAB por múltiplos estados simultaneamente.
- Histórico de atividades de sync OAB.

---

## Plano de Lançamento em Fases

### Fase 1 — Bugs Críticos (P0)
Features que bloqueiam o uso básico do produto:
- Correção do onboarding (desbloqueio do fluxo de apresentação)
- Correção do erro "Erro interno" no calendário
- Correção dos filtros do CRM
- Correção da ordenação por coluna no CRM

**Critério de avanço:** Nenhum dos 4 bugs P0 reproduzível em fluxo normal de uso.

### Fase 2 — Melhorias de Produto (P1)
Features que melhoram a experiência sem bloquear uso:
- Dashboard com auto-refresh + botão de sync manual + agendamento a cada 5h
- Botão "Ver no DJEN" no CRM
- Correção da relevância da busca DJEN

**Critério de avanço:** Funcionalidades validadas manualmente em ambiente de staging; sem regressão nos bugs da Fase 1.

### Fase 3 — Performance (P2)
- Melhorias de carregamento de rotas (cache, `loading.js` consistente, prefetch)

**Critério de avanço:** Navegação perceptivelmente mais fluida validada com ao menos 2 usuários internos.

---

## Métricas de Sucesso

- **Taxa de conclusão do onboarding:** ≥ 80% dos novos usuários completam os 3 passos sem recarregar a página.
- **Taxa de erro no calendário:** Zero erros "Erro interno" relatados em criação de evento após o fix.
- **Precisão dos filtros CRM:** 100% dos filtros aplicados refletem nos resultados retornados.
- **Relevância DJEN:** 100% dos resultados exibidos contêm o termo buscado no corpo do texto.
- **Tempo de atualização do dashboard:** Novos processos aparecem em até 30s após sync concluído.
- **Percepção de velocidade:** Redução subjetiva de lentidão reportada por usuários após Fase 3.

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| A API DJEN não suporta full-text match exato no corpo | Médio — correção de relevância depende da capacidade da API | Aplicar pós-filtragem no backend se necessário |
| Polling de 30s gera carga excessiva no servidor em pico | Baixo — polling só ocorre com aba em foco | Monitorar e ajustar intervalo se necessário |
| Correção do calendário exige mudança em schema ou permissões | Médio — pode afetar outros fluxos | Testar isoladamente antes de subir para produção |
| Ajuste do cron OAB para 5h pode sobrecarregar a API do DataJud | Baixo — rate limit já implementado no worker | Manter rate limit atual; monitorar erros de quota |

---

## Architecture Decision Records

- [ADR-001: Estratégia de Atualização do Dashboard Após Sync OAB](adrs/adr-001.md) — Polling leve de 30s com aba em foco, sem SSE ou infraestrutura nova.

---

## Questões em Aberto

- A causa raiz exata do erro 500 no calendário só será identificada na implementação — pode exigir ajuste no schema de banco ou nas permissões de tenant.
- O campo `texto` da API PJe (`comunicaapi.pje.jus.br`) precisa ser validado para confirmar se suporta match exato no corpo da publicação ou apenas em metadados — isso define se pós-filtragem será necessária.
- O `proximoPrazo` esperado pelos componentes do CRM não é calculado/retornado pela API atual — avaliar se entra no escopo desta entrega ou é adiado.
