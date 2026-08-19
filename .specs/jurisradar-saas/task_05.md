---
status: pending
title: Stripe billing: checkout, webhook e middleware de acesso
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
---

# Task 05: Stripe billing: checkout, webhook e middleware de acesso

## Overview

Implementa o sistema completo de billing via Stripe: criação de sessão de checkout, handler de webhook idempotente, atualização de status de assinatura no banco e middleware que bloqueia acesso à área `(app)` para assinaturas inativas. Inclui o trial gratuito de 14 dias configurado no Stripe Checkout.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 9: Billing e Assinatura") e o TechSpec (seções "Integration Points — Stripe" e "ADR-003") antes de começar
- REFERENCIE O TECHSPEC para o schema da tabela `subscriptions` e os eventos Stripe tratados
- FOQUE NO "QUÊ" — billing, webhook e controle de acesso; não construir UI de portal (task_19)
- MINIMIZE CÓDIGO — use o Stripe SDK; não reimplemente lógica de retry ou idempotência manualmente
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar endpoint `POST /api/billing/checkout` que cria `Stripe.checkout.Session` com `mode: 'subscription'`, `trial_period_days: 14` e preço correto por plano (mensal/anual)
- DEVE criar endpoint `POST /api/billing/webhook` que verifica assinatura HMAC via `stripe.webhooks.constructEvent` antes de processar qualquer evento
- DEVE tratar os eventos: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- DEVE garantir idempotência no webhook via coluna `stripe_event_id` na tabela `subscriptions`
- DEVE atualizar `subscriptions.status` no banco após cada evento relevante
- DEVE estender `middleware.ts` para verificar `session.user.subscriptionStatus in ('trialing', 'active')` nas rotas `/(app)/`; redirecionar para `/billing` caso contrário
- NUNCA processar um evento Stripe sem verificar a assinatura HMAC primeiro
- NUNCA bloquear o fluxo de request enquanto aguarda confirmação do Stripe; o acesso é liberado pelo webhook
</requirements>

## Subtasks

- [ ] 5.1 Instalar `stripe` npm package e criar cliente singleton em `src/lib/stripe.ts`
- [ ] 5.2 Criar `POST /api/billing/checkout` com suporte a plano mensal e anual
- [ ] 5.3 Criar `POST /api/billing/webhook` com verificação de assinatura e handler por tipo de evento
- [ ] 5.4 Implementar idempotência no webhook via `stripe_event_id` em `subscriptions`
- [ ] 5.5 Estender `middleware.ts` para bloquear rotas `/(app)/` com status `past_due` ou `canceled`
- [ ] 5.6 Criar página `/billing` com mensagem de trial expirado e botão de checkout
- [ ] 5.7 Escrever testes para o webhook handler e middleware de acesso

## Implementation Details

Arquivos a criar:
- `src/lib/stripe.ts` — cliente Stripe singleton (`new Stripe(STRIPE_SECRET_KEY)`)
- `src/app/api/billing/checkout/route.ts` — cria sessão de checkout
- `src/app/api/billing/webhook/route.ts` — handler de eventos Stripe
- `src/app/(public)/billing/page.tsx` — página de upgrade/trial expirado

Arquivos a modificar:
- `middleware.ts` — adicionar verificação de `subscriptionStatus` para rotas `/(app)/`
- `src/db/schema.ts` — verificar presença da tabela `subscriptions` (criada na task_02)

Variáveis de ambiente obrigatórias (adicionar ao `.env.local`):
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY` (ID do Stripe Price mensal)
- `STRIPE_PRICE_ANNUAL` (ID do Stripe Price anual)

Veja a seção "Integration Points — Stripe" do TechSpec para a lista completa de eventos e a estrutura da tabela `subscriptions`.

### Relevant Files

- `src/db/schema.ts` — tabela `subscriptions` com `stripe_customer_id`, `stripe_subscription_id`, `status`, `stripe_event_id`
- `middleware.ts` — lógica de proteção de rotas existente a ser estendida
- `src/auth.ts` — `subscriptionStatus` no JWT precisa ser atualizado após webhook; avaliar re-sign ou flag de refresh

### Dependent Files

- `src/app/(app)/configuracoes/billing/page.tsx` (task_19) — portal Stripe Customer Portal
- `src/inngest/sync-processos-scheduler.ts` (task_07) — só processa advogados com `status in ('trialing', 'active')`

### Related ADRs

- [ADR-003: Stripe como Gateway de Billing e Assinaturas](adrs/adr-003.md) — Justifica Stripe sobre Pagar.me e descreve o fluxo de eventos

## Deliverables

- `src/lib/stripe.ts` — cliente singleton
- `POST /api/billing/checkout` funcional com plano mensal e anual
- `POST /api/billing/webhook` com idempotência e tratamento dos 4 eventos
- Middleware bloqueando acesso a `/(app)/` para subscriptions inativas
- Página `/billing` com CTA de upgrade
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Webhook com assinatura HMAC inválida retorna 400 sem processar o evento
  - [ ] Webhook `checkout.session.completed` com `stripe_event_id` já processado retorna 200 sem duplicar registro
  - [ ] Webhook `customer.subscription.deleted` atualiza `subscriptions.status` para `'canceled'`
  - [ ] Webhook `invoice.payment_failed` atualiza `subscriptions.status` para `'past_due'`
- Testes de integração:
  - [ ] `POST /api/billing/checkout?plan=monthly` retorna URL de checkout do Stripe
  - [ ] `POST /api/billing/checkout?plan=annual` retorna URL de checkout com preço anual
  - [ ] Acesso a `/app/dashboard` com `subscriptionStatus: 'canceled'` redireciona para `/billing`
  - [ ] Acesso a `/app/dashboard` com `subscriptionStatus: 'trialing'` é permitido
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Evento Stripe sem assinatura válida nunca é processado
- Mesmo evento processado duas vezes não duplica registro no banco
- Trial de 14 dias funciona sem necessidade de cartão de crédito no checkout
