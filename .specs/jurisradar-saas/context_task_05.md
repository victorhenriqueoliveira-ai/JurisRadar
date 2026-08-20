# Contexto — task_05

## Dependências integradas

- **task_02 ✅:** Tabela `subscriptions` no schema Drizzle com: `id`, `org_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `plan`, `trial_ends_at`, `current_period_end`, `stripe_event_id`.
- **task_03 ✅:** `src/lib/org-context.ts` com `requireOrgContext()`. `subscriptionStatus` no JWT.

## Requisitos

Billing completo via Stripe. Checkout (mensal R$157/mês, anual R$127/mês = R$1.524/ano). Trial 14 dias. Webhook idempotente. Middleware bloqueando rotas sem assinatura ativa.

## Especificação Técnica (TechSpec — Integration Points Stripe)

### Variáveis de ambiente necessárias
```
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
```

Adicionar ao `.env.local` (sem valores reais — usar placeholders ou variáveis mock).

### `src/lib/stripe.ts`
```typescript
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})
```

### `POST /api/billing/checkout`
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  trial_period_days: 14,
  customer_creation: 'always',
  line_items: [{ price: planPrice, quantity: 1 }],
  success_url: `${origin}/app/dashboard?checkout=success`,
  cancel_url: `${origin}/billing`,
  metadata: { orgId }
})
```

### `POST /api/billing/webhook`
Verificar assinatura ANTES de qualquer processamento:
```typescript
const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
```

Eventos a tratar:
- `checkout.session.completed` → criar/atualizar `subscriptions` com status `trialing`
- `invoice.payment_succeeded` → `status = 'active'`
- `invoice.payment_failed` → `status = 'past_due'`
- `customer.subscription.deleted` → `status = 'canceled'`

Idempotência: antes de processar, checar `WHERE stripe_event_id = event.id` na tabela `subscriptions`. Se existe, retornar 200 sem processar.

### Página `/billing`
Rota: `src/app/(public)/billing/page.tsx`
Conteúdo simples: mensagem de trial expirado, dois botões (Assinar Mensal, Assinar Anual) que chamam `/api/billing/checkout`.

## Arquivos a criar

- `src/lib/stripe.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/webhook/route.ts`
- `src/app/(public)/billing/page.tsx`

## Arquivos a modificar

- `middleware.ts` — verificar `subscriptionStatus` para rotas `/(app)/`
- `.env.local` — adicionar variáveis de ambiente (com placeholders)

## Notas importantes

- Rota `/api/billing/webhook` deve ser excluída de verificação de CSRF/auth do middleware
- Usar `req.text()` (não `req.json()`) no webhook para preservar body raw para verificação HMAC
- `export const runtime = 'nodejs'` no webhook handler (não edge)
- Testes: mockar Stripe SDK; não fazer chamadas reais

## Testes

- Vitest para testes unitários do webhook handler
- Mockar `stripe.webhooks.constructEvent`
- Meta: ≥80% cobertura
