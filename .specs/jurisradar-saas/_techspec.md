# TechSpec — JurisRadar SaaS: Plataforma de CRM e Monitoramento de Processos

**Versão:** 1.0  
**Data:** 2026-08-19  
**Status:** Rascunho para aprovação  
**PRD:** [_prd.md](./_prd.md)

---

## Executive Summary

O JurisRadar SaaS é construído sobre o Next.js 14 App Router existente, estendendo o sistema atual de busca de processos com multi-tenancy por escritório (row-level isolation via `org_id`), autenticação aprimorada com OAB/CPF, billing via Stripe, monitoramento assíncrono via Inngest e notificações via Resend. O design system usa a combinação shadcn/ui + uiverse.io harmonizados por uma camada de CSS custom properties, entregando visual premium sem reescrever os primitivos de acessibilidade do Radix UI.

O principal trade-off desta abordagem é a adição de responsabilidade para o desenvolvedor: todas as queries de banco devem filtrar por `org_id` — sem isolamento automático no nível de banco. Isso é mitigado por um helper centralizado e por testes de isolamento automatizados. A ausência de infraestrutura extra (sem microserviços, sem banco separado por tenant, sem fila externa) mantém o custo operacional próximo de zero até os primeiros 500 escritórios.

---

## System Architecture

### Component Overview

```
Browser (Next.js App Router)
│
├── /app/(public)           → Landing page, /login, /register
├── /app/(onboarding)       → Fluxo guiado pós-cadastro (3 passos)
├── /app/(app)              → Área autenticada (sidebar layout)
│   ├── /dashboard          → Dashboard analítico
│   ├── /crm                → CRM de processos
│   ├── /calendario         → Calendário processual
│   ├── /financeiro         → Módulo financeiro
│   ├── /busca              → Busca avançada (adapta existente)
│   ├── /notificacoes       → Central de notificações
│   └── /configuracoes      → Escritório, membros, perfil, billing
│
├── /app/api/
│   ├── /auth/[...nextauth] → NextAuth handlers (existente, expandir)
│   ├── /organizacoes/      → CRUD de escritório e membros
│   ├── /processos/         → Listagem, detalhe, sync, notas
│   ├── /notificacoes/      → Listagem, marcar lida
│   ├── /dashboard/         → Agregações de métricas
│   ├── /calendario/        → Eventos processuais
│   ├── /financeiro/        → Honorários e pagamentos
│   ├── /busca/             → Proxy para DataJud/PJe (adapta existente)
│   └── /billing/           → Checkout, webhook Stripe, portal
│
├── Inngest Functions
│   ├── sync-processos-scheduler   → Cron 3h BRT, emite evento por advogado
│   ├── sync-processos-worker      → Busca DataJud+PJe, diff, persiste
│   ├── notificacao-dispatcher     → Persiste in-app + envia e-mail Resend
│   └── alertas-prazo              → Cron diário, verifica prazos T-5/T-2/T-1
│
└── Serviços externos
    ├── Stripe         → Billing, webhooks, Customer Portal
    ├── Resend         → E-mail transacional (templates React Email)
    ├── Neon (PG)      → PostgreSQL serverless (schema expandido)
    ├── DataJud CNJ    → Busca de processos por OAB/CPF (existente)
    ├── PJe/Comunica   → Intimações e movimentações (existente)
    └── DJe TJSP       → Diário de Justiça (existente)
```

**Fluxo de dados — sync de processos:**
1. Inngest `sync-processos-scheduler` (cron 3h BRT) emite `processos/sync.requested` para cada advogado com assinatura ativa.
2. `sync-processos-worker` consome o evento: chama DataJud API por OAB, chama PJe/Comunica por número de processo, compara `ultima_movimentacao_id` salvo no banco.
3. Movimentações novas são inseridas em `movimentacoes`; worker emite `notificacao/nova` por evento relevante.
4. `notificacao-dispatcher` persiste registro em `notificacoes` (in-app) e enfileira e-mail via Resend.
5. Frontend usa polling leve (30s) ou Server-Sent Events para atualizar badge de notificações sem refresh.

**Isolamento multi-tenant:**  
Toda Route Handler e Server Action extrai `orgId` da sessão JWT via `requireOrgId(session)`. Helper lança `UnauthorizedError` se ausente. Nunca aceita `org_id` do request body.

---

## Implementation Design

### Core Interfaces

**Tipos de domínio centrais (`src/types/domain.ts`):**

```typescript
export type MemberRole = 'socio' | 'associado' | 'estagiario'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled'
export type ProcessoStatus = 'ativo' | 'arquivado' | 'encerrado'
export type HonorarioTipo = 'fixo' | 'exito' | 'misto'
export type PagamentoStatus = 'pendente' | 'parcial' | 'quitado'
export type EventoTipo = 'prazo_fatal' | 'prazo_normal' | 'audiencia' | 'intimacao'
export type NotificacaoTipo =
  | 'intimacao' | 'citacao' | 'decisao' | 'sentenca' | 'publicacao_dje' | 'prazo_vencendo'

export interface OrgContext {
  orgId: string
  userId: string
  role: MemberRole
}
```

**Helper de contexto multi-tenant (`src/lib/org-context.ts`):**

```typescript
import { auth } from '@/auth'
import { UnauthorizedError } from '@/lib/errors'

export async function requireOrgContext(): Promise<OrgContext> {
  const session = await auth()
  if (!session?.user?.orgId) throw new UnauthorizedError()
  return {
    orgId: session.user.orgId,
    userId: session.user.id,
    role: session.user.role as MemberRole,
  }
}

export function requireRole(ctx: OrgContext, minimum: MemberRole): void {
  const hierarchy: MemberRole[] = ['estagiario', 'associado', 'socio']
  if (hierarchy.indexOf(ctx.role) < hierarchy.indexOf(minimum)) {
    throw new ForbiddenError()
  }
}
```

**Serviço de processos (`src/services/processos.ts`):**

```typescript
export interface SyncResult {
  adicionados: number
  atualizados: number
  erros: string[]
  fonte: 'datajud' | 'pje' | 'dje'
}

export interface ProcessoComMovimentacoes {
  processo: Processo
  movimentacoes: Movimentacao[]
  honorario: Honorario | null
  notas: NotaProcesso[]
}
```

### Data Models

**Novas tabelas (Drizzle schema em `src/db/schema.ts`):**

```sql
-- Escritórios (tenants)
organizations (
  id          uuid PK default gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  created_at  timestamptz default now()
)

-- Membros do escritório
org_members (
  id       uuid PK,
  org_id   uuid FK organizations(id) ON DELETE CASCADE,
  user_id  uuid FK users(id) ON DELETE CASCADE,
  role     text NOT NULL CHECK (role IN ('socio','associado','estagiario')),
  UNIQUE(org_id, user_id)
)

-- Assinaturas Stripe
subscriptions (
  id                      uuid PK,
  org_id                  uuid FK organizations(id) UNIQUE,
  stripe_customer_id      text NOT NULL,
  stripe_subscription_id  text UNIQUE,
  status                  text NOT NULL,   -- trialing|active|past_due|canceled
  plan                    text NOT NULL,   -- monthly|annual
  trial_ends_at           timestamptz,
  current_period_end      timestamptz,
  stripe_event_id         text UNIQUE      -- idempotência webhook
)

-- Processos monitorados
processos (
  id                    uuid PK,
  org_id                uuid FK organizations(id),
  numero_cnj            text NOT NULL,
  tribunal              text,
  area_direito          text,
  status                text DEFAULT 'ativo',
  responsavel_id        uuid FK users(id),
  ultima_movimentacao   text,
  ultima_sync_at        timestamptz,
  fonte_sync            text[],           -- ['datajud','pje','dje']
  arquivado_at          timestamptz,
  created_at            timestamptz default now(),
  INDEX (org_id, status),
  INDEX (org_id, responsavel_id)
)

-- Movimentações
movimentacoes (
  id             uuid PK,
  org_id         uuid FK organizations(id),
  processo_id    uuid FK processos(id) ON DELETE CASCADE,
  data           timestamptz NOT NULL,
  descricao      text NOT NULL,
  tipo           text,                   -- intimacao|decisao|sentenca|etc
  fonte          text,                   -- datajud|pje|dje
  externo_id     text,                   -- ID na fonte de origem
  UNIQUE(processo_id, externo_id),
  INDEX (processo_id, data DESC),
  INDEX (org_id, data DESC)
)

-- Notificações in-app
notificacoes (
  id           uuid PK,
  org_id       uuid FK organizations(id),
  user_id      uuid FK users(id),
  processo_id  uuid FK processos(id),
  tipo         text NOT NULL,
  titulo       text NOT NULL,
  corpo        text,
  lida         bool DEFAULT false,
  lida_at      timestamptz,
  created_at   timestamptz default now(),
  INDEX (user_id, lida, created_at DESC)
)

-- Honorários por processo
honorarios (
  id                  uuid PK,
  org_id              uuid FK organizations(id),
  processo_id         uuid FK processos(id) UNIQUE,
  tipo                text NOT NULL,       -- fixo|exito|misto
  valor               numeric(12,2),
  data_prevista       date,
  status_pagamento    text DEFAULT 'pendente',
  INDEX (org_id, status_pagamento)
)

-- Pagamentos de honorários
pagamentos (
  id            uuid PK,
  org_id        uuid FK organizations(id),
  honorario_id  uuid FK honorarios(id) ON DELETE CASCADE,
  valor         numeric(12,2) NOT NULL,
  pago_em       date NOT NULL,
  observacao    text
)

-- Notas internas por processo
notas_processo (
  id           uuid PK,
  org_id       uuid FK organizations(id),
  processo_id  uuid FK processos(id) ON DELETE CASCADE,
  user_id      uuid FK users(id),
  conteudo     text NOT NULL,
  created_at   timestamptz default now()
)

-- Eventos do calendário
eventos_calendario (
  id           uuid PK,
  org_id       uuid FK organizations(id),
  processo_id  uuid FK processos(id) ON DELETE CASCADE,
  tipo         text NOT NULL,     -- prazo_fatal|prazo_normal|audiencia|intimacao
  titulo       text NOT NULL,
  data         date NOT NULL,
  alertado_t5  bool DEFAULT false,
  alertado_t2  bool DEFAULT false,
  alertado_t1  bool DEFAULT false,
  INDEX (org_id, data)
)
```

**Tabelas existentes a modificar:**
- `users`: adicionar `cpf text`, `oab_numero text`, `oab_estado text(2)`, `totp_secret text`
- `searches`: adicionar `org_id uuid FK organizations(id)`, `user_id` já existe
- `djeSearches`: adicionar `org_id uuid FK organizations(id)`

### API Endpoints

**Organização e membros:**

| Método | Rota | Descrição | Auth mínima |
|--------|------|-----------|-------------|
| POST | `/api/organizacoes` | Criar escritório (cria org + vincula fundador como sócio) | Usuário autenticado |
| GET | `/api/organizacoes/me` | Dados do escritório atual | associado |
| PATCH | `/api/organizacoes/me` | Atualizar dados do escritório | socio |
| GET | `/api/organizacoes/me/membros` | Listar membros e papéis | associado |
| POST | `/api/organizacoes/me/membros` | Convidar membro por e-mail | socio |
| PATCH | `/api/organizacoes/me/membros/:id` | Alterar papel do membro | socio |
| DELETE | `/api/organizacoes/me/membros/:id` | Remover membro | socio |

**Processos:**

| Método | Rota | Descrição | Auth mínima |
|--------|------|-----------|-------------|
| GET | `/api/processos` | Listagem paginada com filtros | estagiario |
| GET | `/api/processos/:id` | Detalhe com movimentações, notas, honorário | estagiario |
| POST | `/api/processos/sync` | Dispara sync manual (emite evento Inngest) | associado |
| PATCH | `/api/processos/:id` | Atualizar responsável, status | associado |
| DELETE | `/api/processos/:id` | Arquivar processo | associado |
| POST | `/api/processos/:id/notas` | Adicionar nota interna | associado |
| DELETE | `/api/processos/:id/notas/:notaId` | Remover nota (somente autor ou sócio) | associado |

**Notificações:**

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notificacoes` | Listar notificações do usuário (`?lida=false&limit=20`) |
| PATCH | `/api/notificacoes/:id/lida` | Marcar como lida |
| PATCH | `/api/notificacoes/lida-todas` | Marcar todas como lidas |
| GET | `/api/notificacoes/count` | Contagem de não lidas (para badge, polling) |

**Dashboard:**

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard` | Métricas agregadas do escritório (`?scope=pessoal\|escritorio`) |
| GET | `/api/dashboard/prazos` | Prazos críticos dos próximos 30 dias |
| GET | `/api/dashboard/movimentacoes-recentes` | Últimas 10 movimentações |

**Calendário:**

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/calendario` | Eventos num intervalo (`?de=YYYY-MM-DD&ate=YYYY-MM-DD`) |
| GET | `/api/calendario/export.ics` | Export iCal do mês atual |

**Financeiro:**

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/financeiro` | Dashboard financeiro (totais por período) |
| GET | `/api/financeiro/honorarios` | Listar honorários com filtros |
| POST | `/api/financeiro/honorarios` | Criar/atualizar honorário por processo |
| POST | `/api/financeiro/honorarios/:id/pagamentos` | Registrar pagamento |
| DELETE | `/api/financeiro/honorarios/:id/pagamentos/:pgId` | Remover pagamento |

**Billing:**

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/billing/checkout` | Criar sessão Stripe Checkout (mensal ou anual) |
| GET | `/api/billing/portal` | Redirecionar para Stripe Customer Portal |
| POST | `/api/billing/webhook` | Handler idempotente de eventos Stripe |

---

## Integration Points

### Stripe

- **Autenticação:** `STRIPE_SECRET_KEY` (server-side), `STRIPE_WEBHOOK_SECRET` (validação de assinatura HMAC).
- **Produtos:** dois Stripe Products (mensal R$157, anual R$1.524) criados no dashboard Stripe, IDs em variáveis de ambiente.
- **Checkout:** `/api/billing/checkout` cria `Stripe.checkout.Session` com `mode: 'subscription'`, `trial_period_days: 14`, `customer_creation: 'always'`. Sucesso redireciona para `/app/dashboard?checkout=success`.
- **Webhook:** `/api/billing/webhook` verifica assinatura com `stripe.webhooks.constructEvent`. Eventos tratados: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`. Idempotência via coluna `stripe_event_id` em `subscriptions`.
- **Middleware de acesso:** `src/middleware.ts` estendido — rota `/(app)/` verifica `session.user.subscriptionStatus in ['trialing', 'active']`; caso contrário redireciona para `/billing`.

### DataJud CNJ (existente, expandir)

- **Autenticação:** API key via header `Authorization: ApiKey {DATAJUD_API_KEY}`.
- **Busca por OAB:** `POST /api_publica/{tribunal}/_search` com filtro `representante.OAB = {estado}{numero}`. Cobrir todos os tribunais suportados iterativamente.
- **Retry:** lógica existente em `src/lib/datajud/client.ts` (3 tentativas, backoff exponencial) — reutilizar integralmente.
- **Tratamento de erros:** `DataJudRateLimitError` → aguardar backoff; `DataJudUnavailableError` → registrar falha no sync, continuar para próxima fonte.

### PJe / Comunica (existente, expandir)

- **Endpoint atual:** `comunicaapi.pje.jus.br/api/v1/comunicacao` (já integrado em `/api/djen-nacional`).
- **Busca por processo:** usar campo `numeroProcesso` para buscar movimentações de processos já importados.
- **Limitação conhecida:** API requer credencial CNJ Corporativo para acesso amplo. Na v1.0, usar a integração pública existente para buscar por número CNJ; expandir para busca por OAB quando credencial for obtida.
- **Fallback:** se PJe indisponível, sync continua com DataJud; banner de aviso no CRM informa "dados PJe desatualizados".

### Resend (novo)

- **SDK:** `import { Resend } from 'resend'` — instância singleton em `src/lib/email/resend.ts`.
- **Templates:** React Email em `src/lib/email/templates/` — cada template é um componente `.tsx` exportando `<EmailComponent />` e função `renderToHtml()`.
- **Dispatch:** sempre via Inngest `notificacao-dispatcher` — nunca chamada direta do request handler para evitar timeout.
- **Rate limit:** plano Resend Starter ($20/mês): 50.000 e-mails/mês, sem limite diário. Configurar antes do beta.

### uiverse.io + Design System (novo)

- **Fonte:** componentes copiados manualmente de https://uiverse.io para `src/components/ui-custom/`.
- **Integração:** CSS variables definidas em `src/styles/tokens.css`, importado em `src/app/globals.css`. Valores hardcoded nos componentes uiverse.io substituídos por `var(--jr-*)`.
- **Componentes prioritários a incorporar:**
  - `UiButton` — botão com efeito glow/ripple (substitui `<Button>` em CTAs primários)
  - `GlassCard` — card glassmorphism para métricas do dashboard
  - `PulsingBadge` — badge animado para notificações urgentes
  - `ImportLoader` — loader animado para tela de importação de processos no onboarding
  - `EmptyStateIllustrated` — empty state com SVG animado para seções sem dados

---

## Impact Analysis

| Componente | Tipo de Impacto | Descrição e Risco | Ação Necessária |
|---|---|---|---|
| `src/db/schema.ts` | modificado | Adição de 10 novas tabelas + 3 colunas em tabelas existentes. Risco alto: migrations destrutivas em `users`. | Migration cuidadosa; testar em staging primeiro |
| `src/auth.ts` | modificado | Adicionar `orgId`, `role`, `subscriptionStatus` ao JWT; callbacks do NextAuth expandidos. | Atualizar tipo `Session` em `next-auth.d.ts` |
| `middleware.ts` | modificado | Adicionar verificação de subscription status + redirecionamento para `/billing`. | Testar rotas protegidas com subscription cancelada |
| `src/lib/datajud/client.ts` | modificado | Adicionar parâmetro de busca por OAB além da busca atual. | Manter compatibilidade com código de busca existente |
| `/api/djen-nacional/route.ts` | modificado | Adaptar para filtrar por `org_id` do usuário. | Adicionar `org_id` ao contexto; reutilizar lógica de busca |
| `src/inngest/` | modificado | Adicionar 4 novas funções; manter função DJe existente. | Testar funções existentes não foram quebradas |
| `src/app/(protected)/` | refactor | Renomear para `(app)` e adicionar verificação de subscription no layout. | Atualizar todos os imports e redirect configs |
| `src/app/globals.css` | modificado | Importar tokens.css; sem conflito esperado. | Verificar ordem de importação Tailwind |

---

## Testing Approach

### Unit Tests

- **`requireOrgContext()`:** sessão válida retorna contexto; sessão sem `orgId` lança `UnauthorizedError`; sessão sem papel lança `ForbiddenError`.
- **`requireRole()`:** papel sócio aceita qualquer nível; estagiário rejeitado para ações de associado/sócio.
- **Diff de movimentações (`src/lib/processos/diff.ts`):** lista vazia retorna zero novidades; movimentações com mesmo `externo_id` não duplicam; movimentações novas identificadas corretamente.
- **Webhook Stripe:** evento `checkout.session.completed` atualiza status para `active`; evento duplicado (mesmo `stripe_event_id`) é ignorado silenciosamente; evento desconhecido retorna 200 (sem crash).
- **Cálculo de prazos (`src/lib/calendario/prazos.ts`):** intimação com D+15 retorna data correta; final de semana é avançado para segunda-feira; feriado nacional é pulado.

### Integration Tests

- **Isolamento multi-tenant:** usuário do org A não consegue ler processos do org B via `GET /api/processos/:id`; retorna 403.
- **Sync completo:** `sync-processos-worker` com mock de DataJud retornando 2 processos → 2 registros em `processos` + 2 eventos `notificacao/nova` emitidos.
- **Fluxo de billing:** checkout → webhook `checkout.session.completed` → `subscriptions.status = 'active'` → acesso à área `/app/` liberado.
- **Notificações:** evento `notificacao/nova` → registro em `notificacoes` + chamada Resend mockada → `GET /api/notificacoes/count` retorna 1.

---

## Development Sequencing

### Build Order

1. **Design tokens + componentes uiverse.io base** — sem dependências. Cria `src/styles/tokens.css`, `src/components/ui-custom/`. Define paleta visual de todo o produto.
2. **Schema de banco + migrations** — depende do passo 1 (paralelo). Cria tabelas `organizations`, `org_members`, `subscriptions`, `processos`, `movimentacoes`, `notificacoes`, `honorarios`, `pagamentos`, `notas_processo`, `eventos_calendario`. Modifica `users`.
3. **Auth expandido** — depende do passo 2. Adiciona CPF, OAB ao cadastro; adiciona `orgId`, `role`, `subscriptionStatus` ao JWT; cria fluxo de criação automática de organização no primeiro login.
4. **Layout base e sidebar responsiva** — depende dos passos 1 e 3. Cria `src/app/(app)/layout.tsx` com sidebar, header e suporte a dark mode.
5. **Stripe billing** — depende dos passos 2 e 3. Cria tabela `subscriptions`, endpoints `/api/billing/*`, middleware de acesso.
6. **Resend + templates de e-mail base** — depende do passo 3 (para dados de usuário). Cria `src/lib/email/`, templates `WelcomeOnboarding.tsx`, `ConviteMembro.tsx`, `FalhaBilling.tsx`.
7. **Importação automática de processos (Inngest + DataJud/PJe)** — depende dos passos 2, 3 e 5 (assinatura ativa). Cria `sync-processos-scheduler` e `sync-processos-worker`. Insere em `processos` e `movimentacoes`.
8. **CRM backend** — depende dos passos 2, 3 e 7. Endpoints `/api/processos/*`, Server Actions para notas.
9. **CRM frontend** — depende dos passos 1, 4 e 8. Tabela de processos, filtros, painel lateral com histórico de movimentações.
10. **Notificações in-app** — depende dos passos 2, 3 e 8. Tabela `notificacoes`, endpoints `/api/notificacoes/*`, componente sino no header, painel lateral.
11. **Worker de diff + dispatch** — depende dos passos 7 e 10. `notificacao-dispatcher` Inngest: persiste notificação + chama Resend.
12. **Templates de notificação Resend** — depende dos passos 6 e 11. Templates `NotificacaoIntimacao.tsx`, `AlertaPrazo.tsx`, `ResumoDiario.tsx`.
13. **Dashboard analítico** — depende dos passos 1, 4, 8 e 10. Endpoint `/api/dashboard`, componentes com Recharts, cards `GlassCard` do uiverse.io.
14. **Calendário processual** — depende dos passos 4, 8 e 11. Tabela `eventos_calendario`, endpoint `/api/calendario`, UI de calendário, export `.ics`.
15. **Alertas de prazo (Inngest)** — depende dos passos 11 e 14. Função `alertas-prazo` (cron diário), verifica `eventos_calendario` e emite notificações T-5/T-2/T-1.
16. **Módulo financeiro** — depende dos passos 4, 8 e 9. Endpoints `/api/financeiro/*`, UI de honorários e pagamentos integrada ao painel do CRM.
17. **Busca avançada (adaptação SaaS)** — depende dos passos 3 e 4. Adiciona `org_id` ao histórico de buscas; favoritos; botão "Adicionar ao CRM".
18. **Onboarding guiado** — depende dos passos 3, 4 e 7. Fluxo de 3 passos pós-cadastro, tour interativo com `driver.js` ou equivalente.
19. **Stripe Customer Portal + self-service** — depende do passo 5. Endpoint `/api/billing/portal`, página `/configuracoes/billing`.
20. **Gestão de escritório e membros** — depende dos passos 3, 4 e 9. Endpoints `/api/organizacoes/me/*`, UI de convites, papéis e configurações.

### Technical Dependencies

- **Variáveis de ambiente obrigatórias antes de qualquer deploy:**
  - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` (IDs dos Stripe Prices)
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
  - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
  - `NEXTAUTH_SECRET` (já existe), `NEXTAUTH_URL`
- **Aprovação de domínio de envio no Resend** antes do beta (DNS records: SPF, DKIM, DMARC).
- **Inngest Cloud:** conta criada e app vinculado antes de implementar funções de monitoramento.
- **Stripe:** products e prices criados no dashboard antes de implementar checkout.

---

## Monitoring and Observability

- **Inngest Dashboard:** acompanhar taxa de sucesso/falha de cada função, tempo médio de execução e fila pendente. Alertar se `sync-processos-worker` tiver > 5% de falhas num período de 1h.
- **Stripe Dashboard:** MRR, churn, falhas de cobrança. Configurar alert de Stripe para `invoice.payment_failed` recorrente.
- **Logs estruturados:** cada Route Handler loga `{ orgId, userId, action, durationMs, status }`. CPF e OAB nunca aparecem em logs — apenas IDs internos.
- **Vercel Analytics:** Core Web Vitals por página; alertar se LCP > 2,5s nas páginas Dashboard e CRM.
- **Uptime externo:** monitorar endpoints `/api/processos` e `/api/notificacoes/count` a cada 5 min (Vercel ou Better Uptime).

---

## Technical Considerations

### Key Decisions

1. **Row-level isolation sobre schema-per-tenant:** mais simples operacionalmente, sem overhead de migrations por tenant. Trade-off: disciplina de código obrigatória — toda query deve filtrar `org_id`. Ver [ADR-002](adrs/adr-002.md).

2. **Inngest sobre Vercel Cron:** funções step-by-step sem timeout, retry automático e observabilidade nativa. Trade-off: dependência de terceiro para funcionalidade crítica. Ver [ADR-005](adrs/adr-005.md).

3. **Design tokens compartilhados (shadcn/ui + uiverse.io):** manter acessibilidade do Radix UI + visual premium do uiverse.io sem duplicação de variáveis. Trade-off: cada componente uiverse.io exige adaptação manual (~15 min por componente). Ver [ADR-004](adrs/adr-004.md).

4. **Resend + React Email:** templates TypeScript testáveis localmente com `react-email dev`. Trade-off: provedor mais novo que SendGrid; menor histórico de uptime em escala. Ver [ADR-006](adrs/adr-006.md).

5. **Stripe para billing:** Customer Portal elimina ~2 semanas de desenvolvimento. Trade-off: Pix requer configuração adicional (Stripe Financial Connections). Ver [ADR-003](adrs/adr-003.md).

### Known Risks

- **API PJe/Comunica com credencial restrita:** a busca atual por texto funciona, mas busca por OAB requer credencial CNJ Corporativo não disponível para fornecedores de software automaticamente. Mitigação: na v1.0, sincronizar PJe por número CNJ dos processos já importados via DataJud; comunicar limitação no onboarding.
- **Volume de sync com 500 escritórios:** sync diário de 500 escritórios × média 80 processos = 40.000 queries ao DataJud. Mitigação: rate limiting no worker (max 10 processos/segundo por escritório); backoff em `DataJudRateLimitError`; monitorar consumo de API.
- **Cálculo de prazos sem calendário judicial completo:** cada tribunal tem feriados locais diferentes. Mitigação: na v1.0, calcular D+prazo excluindo apenas feriados nacionais (tabela fixa em código); indicar no UI que prazos são estimativas e orientar verificação manual.
- **Migração de usuários existentes:** usuários atuais do JurisRadar não têm `org_id`. Mitigação: migration cria uma organização padrão por usuário existente + vincula como sócio; nenhum dado é perdido.

---

## Architecture Decision Records

- [ADR-001: Estratégia de Lançamento — Plataforma Completa vs MVP Faseado](adrs/adr-001.md) — Decisão de lançar produto completo em vez de MVP faseado.
- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — Row-level isolation escolhido sobre schema-per-tenant e banco separado.
- [ADR-003: Stripe como Gateway de Billing e Assinaturas](adrs/adr-003.md) — Stripe escolhido sobre Pagar.me pelo Customer Portal e SDK TypeScript.
- [ADR-004: Design System — Tokens Compartilhados entre shadcn/ui e uiverse.io](adrs/adr-004.md) — Camada de CSS custom properties harmonizando os dois sistemas visuais.
- [ADR-005: Inngest para Worker de Monitoramento de Processos](adrs/adr-005.md) — Inngest expandido em vez de Vercel Cron ou microserviço separado.
- [ADR-006: Resend como Provedor de E-mail Transacional](adrs/adr-006.md) — Resend + React Email escolhido pelo ecossistema TypeScript nativo.
