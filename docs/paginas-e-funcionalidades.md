# JurisRadar — Páginas e Funcionalidades

> Documento de referência para criação de design.
> Identidade visual: azul navy `#0f2d5e` + dourado `#c9a84c`. Sempre light mode.

---

## O que é o JurisRadar

JurisRadar é um SaaS para advogados autônomos e pequenos escritórios de advocacia.

O produto resolve dois problemas centrais da rotina jurídica:

**1. Prospecção de casos novos** — o advogado busca publicações em tempo real nos principais diários eletrônicos do país (DJEN Nacional, DataJud/CNJ, DJe TJSP) usando termos, bairros, nomes de partes ou número de processo. Quando encontra um caso de interesse, adiciona ao CRM com um clique.

**2. Gestão dos processos ativos** — o advogado acompanha em tempo real todos os processos que já representa, recebendo alertas automáticos por e-mail e notificações no sistema sempre que surgir uma nova intimação, prazo crítico ou movimentação relevante.

Tudo em um único lugar: dashboard com visão geral, CRM de processos, calendário de prazos, módulo financeiro para honorários e configurações de escritório.

**Planos:** Mensal R$ 157 / Anual R$ 127 por mês (cobrança anual).

---

## Estrutura geral do app

O app tem um layout fixo com:

- **Sidebar lateral esquerda** — navegação principal com seções agrupadas
- **Header superior** — nome do usuário, sino de notificações, toggle dark/light, avatar com menu de usuário
- **Área de conteúdo** — onde cada página é renderizada

### Sidebar

Seções e itens:

| Seção | Item | Rota |
|-------|------|------|
| INÍCIO | Dashboard | `/dashboard` |
| PROCESSOS | CRM | `/crm` |
| BUSCAS DE CASOS | DJEN Nacional | `/djen-nacional` |
| BUSCAS DE CASOS | DataJud / CNJ | `/busca/datajud` |
| BUSCAS DE CASOS | PJe Nacional | `/busca/pje` |
| BUSCAS DE CASOS | DJe TJSP | `/busca/dje` |
| AGENDA | Calendário | `/calendario` |
| FINANCEIRO | Honorários | `/financeiro` |
| SISTEMA | Notificações | `/notificacoes` |
| SISTEMA | Configurações | `/configuracoes` |

---

## Páginas públicas / autenticação

### Login — `/login`

**Objetivo:** autenticar o advogado na plataforma.

**Elementos na tela:**
- Logo JurisRadar centralizada
- Título "Acesse sua conta"
- Campo e-mail
- Campo senha
- Botão "Entrar"
- Mensagem de erro inline (e-mail ou senha inválidos)

---

### Onboarding — `/onboarding`

**Objetivo:** configurar o escritório na primeira vez que o advogado acessa após criar conta.

**Elementos na tela:**
- Passo a passo (wizard)
- Nome do escritório
- OAB / estado
- Tipo de advocacia (trabalhista, cível, criminal, etc.)
- Botão "Concluir configuração"

---

### Billing / Assinatura — `/billing`

**Objetivo:** contratar ou reativar plano quando o trial expira ou assinatura está inativa.

**Elementos na tela:**
- Apresentação dos planos (Mensal R$ 157 / Anual R$ 127/mês)
- Botão de contratar
- Informações de trial restante (quando em período de teste)

---

## Páginas do app (requerem login + assinatura ativa)

### Dashboard — `/dashboard`

**Objetivo:** visão geral da situação do escritório — processos, prazos e movimentações.

**Elementos na tela:**

**KPIs (4 cards no topo):**
- Processos Ativos — total em andamento
- Urgência Alta — processos com prazo vencendo em 2 dias
- Prazos em 7 dias — compromissos na próxima semana
- Intimações não lidas — notificações pendentes de leitura

**Gráficos (linha 1 — 2 colunas):**
- Distribuição por Status — gráfico de pizza/donut (ex: Ativo, Arquivado, Aguardando, Suspenso)
- Por Área do Direito — gráfico de barras horizontais (ex: Trabalhista, Cível, Família)

**Gráfico (linha 2 — largura total):**
- Evolução Mensal (últimos 6 meses) — gráfico de linha ou área com quantidade de processos novos por mês

**Listas (linha 3 — 2 colunas):**
- Prazos Críticos — lista dos processos com prazos mais urgentes, com badge de dias restantes
- Movimentações Recentes — timeline das últimas atualizações nos processos (intimações, despachos, decisões)

---

### CRM de Processos — `/crm`

**Objetivo:** gerenciar todos os processos do advogado com filtros, ordenação e detalhes.

**Elementos na tela:**

**Barra de filtros (topo):**
- Campo de busca por número do processo ou nome da parte
- Filtro por status (Ativo, Arquivado, Suspenso, etc.)
- Filtro por área do direito
- Filtro por tribunal
- Filtro por data de cadastro

**Tabela de processos:**
- Colunas: Número CNJ, Partes, Tribunal, Área, Status, Último movimento, Data cadastro
- Ordenação por qualquer coluna
- Paginação com infinite scroll (carrega mais ao rolar)
- Ação "Ver detalhes" em cada linha

**Painel de detalhes (sheet lateral — abre ao clicar no processo):**
- Número CNJ completo
- Partes (polo ativo e passivo)
- Tribunal e vara
- Histórico de movimentações em timeline
- Notas do advogado (campo de texto livre, salvo no banco)
- Botão para abrir no PJe/CNJ

**Cards em mobile** (substitui a tabela em telas pequenas):
- Card por processo com as principais informações

---

### DJEN Nacional — `/djen-nacional`

**Objetivo:** buscar publicações no Diário da Justiça Eletrônico Nacional (DJEN/CNJ) para captar novos casos em tempo real.

**Título na tela:** "Publicações DJEN"
**Subtítulo:** "Diário de Justiça Eletrônico Nacional — publicações do TJSP em tempo real via API do CNJ."

**Formulário de busca:**
- Campo "Número do processo (CNJ)" — busca direta por número CNJ (ex: 1501260-42.2024.8.26.0052); alternativo à busca por termos
- Divisor "ou busque por termos"
- Campo "Busca principal" — termo de busca principal (ex: capão redondo, banco bradesco, avenida paulista); dica: usar termo mais específico como bairro, nome da parte, endereço
- Campo "Filtro adicional no texto" (opcional) — filtra os resultados da busca principal pelo conteúdo do texto da publicação (ex: busca e apreensão, alimentos, divórcio)
- Campo "Data de disponibilização" — dd/mm/aaaa; deixar em branco para todas as datas
- Campo "Tipo" — dropdown com "Todos os tipos" e opções de tipo de publicação
- Botão "Buscar no DJEN"

**Favoritos salvos:**
- Seção com buscas favoritas salvas anteriormente
- Clicar em um favorito preenche o formulário automaticamente

**Lista de resultados:**
- Card por publicação com: número do processo, tribunal, data de disponibilização, trecho do texto da publicação
- Botão "Adicionar ao CRM" em cada resultado
- Indicador de total de resultados encontrados

---

### PJe Nacional — `/busca/pje`

**Objetivo:** buscar publicações no sistema PJe Nacional com filtro por nome de parte.

**Formulário de busca:**
- Campo "Termo de busca" — obrigatório, mínimo 2 caracteres
- Campo "Nome da parte" — opcional
- Campo "Data inicial" — opcional
- Campo "Data final" — opcional
- Botão "Buscar"

**Lista de resultados:**
- Card por publicação com: número do processo, tribunal, data, trecho do texto
- Botão "Adicionar ao CRM" em cada resultado

---

### DJe TJSP — `/busca/dje`

**Objetivo:** buscar publicações no Diário da Justiça Eletrônico do Tribunal de Justiça de SP.

**Elementos na tela:**

**Formulário de busca:**
- Campo "Termo de busca" — obrigatório, mínimo 2 caracteres
- Campo "Data inicial" — obrigatório
- Campo "Data final" — obrigatório (deve ser >= data inicial)
- Botão "Buscar"

**Favoritos salvos:**
- Mesma mecânica do DJEN

**Lista de resultados:**
- Card por publicação com: número do processo, data, caderno, trecho do texto
- Botão "Adicionar ao CRM"

---

### Calendário Processual — `/calendario`

**Objetivo:** visualizar prazos e audiências do advogado em formato de calendário.

**Elementos na tela:**
- Calendário mensal (navegação mês anterior / próximo)
- Eventos no calendário: prazos, audiências, reuniões
- Cores por tipo de evento (prazo urgente = vermelho, audiência = azul, etc.)
- Clique no evento abre detalhes (processo vinculado, descrição, hora)
- Botão "Novo evento" para adicionar manualmente

---

### Financeiro / Honorários — `/financeiro`

**Objetivo:** controlar honorários e saúde financeira do escritório.

**Elementos na tela:**

**KPIs financeiros (cards no topo):**
- Total a receber
- Recebido no mês
- Em atraso
- Previsão do próximo mês

**Tabela de honorários:**
- Colunas: Processo, Cliente, Valor, Status (Pago, Pendente, Atrasado), Vencimento
- Filtro por status e período
- Ação de marcar como pago

---

### Notificações — `/notificacoes`

**Objetivo:** listar todas as notificações do advogado (intimações, prazos, movimentações novas).

**Elementos na tela:**
- Filtro por tipo: Intimação, Prazo, Movimentação, Sistema
- Lista de notificações com: ícone por tipo, título, descrição, data/hora, badge "não lida"
- Botão "Marcar todas como lidas"
- Clicar em uma notificação marca como lida e redireciona ao processo
- Estado vazio quando não há notificações

**Sino no header:**
- Badge com contagem de não lidas (atualiza a cada 30s)
- Clicar abre painel lateral (sheet) com as últimas 10 notificações

---

### Configurações — `/configuracoes`

**Objetivo:** gerenciar perfil, escritório, preferências e assinatura.

**Elementos na tela (abas ou menu lateral):**

**Perfil:**
- Nome, foto de perfil, e-mail, OAB
- Botão alterar senha

**Escritório:**
- Nome do escritório
- Endereço, telefone, logo
- Membros da equipe (convidar advogados)

**Notificações:**
- Toggle: receber e-mail de intimações
- Toggle: receber e-mail de prazos
- Toggle: notificações push no browser

**Assinatura:**
- Plano atual (Trial / Mensal / Anual)
- Data de vencimento
- Botão "Upgrade" ou "Gerenciar plano"
- Histórico de faturas

---

## Comportamento responsivo

| Breakpoint | Sidebar | Layout |
|-----------|---------|--------|
| Mobile < 768px | Oculta; hambúrguer no header abre drawer | Conteúdo em coluna única |
| Tablet 768–1279px | Visível, somente ícones (56px) | Grid simplificado |
| Desktop ≥ 1280px | Visível completa com labels (240px) | Grid completo |

---

## Fluxo de estados do usuário

```
Acessa URL
  └─ Sem sessão → /login
       └─ Login OK
            ├─ Sem escritório configurado → /onboarding
            ├─ Assinatura inativa → /billing
            └─ Tudo OK → /dashboard
```

---

## Paleta de cores de referência

| Token | Cor | Uso |
|-------|-----|-----|
| `--jr-primary` | `#0f2d5e` | Navy — cor principal, sidebar ativo, botões primários |
| `--jr-accent` | `#c9a84c` | Dourado — destaques, badges especiais |
| Background | `#f9fafb` | Cinza muito claro — fundo do app |
| Sidebar bg | `#ffffff` | Branco — sidebar e cards |
| Texto principal | `#111827` | Quase preto |
| Texto secundário | `#6b7280` | Cinza médio |
| Borda | `#e5e7eb` | Cinza claro |
| Urgência | `#ef4444` | Vermelho — prazos críticos |
| Sucesso | `#22c55e` | Verde — pago, concluído |
| Atenção | `#f59e0b` | Amarelo — pendente, atenção |
