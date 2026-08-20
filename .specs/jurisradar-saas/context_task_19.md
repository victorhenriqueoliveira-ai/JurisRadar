# Contexto — task_19

## Dependências integradas

- **task_05 ✅:** `src/lib/stripe.ts` singleton. Tabela `subscriptions`. Página `/billing` criada. Middleware de acesso.
- **task_04 ✅:** `src/app/(app)/layout.tsx` criado. `AppHeader.tsx` criado.

## Requisitos

Customer Portal Stripe self-service. Página de billing com status. TrialBanner no layout. Sem reimplementar o que o Stripe já faz.

## Especificação

### `GET /api/billing/portal`

```typescript
// src/app/api/billing/portal/route.ts
export async function GET() {
  const ctx = await requireOrgContext()
  
  // Buscar stripe_customer_id da organização
  const subscription = await db.select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, ctx.orgId))
    .limit(1)
  
  if (!subscription[0]?.stripeCustomerId) {
    return Response.json({ error: 'Sem assinatura ativa' }, { status: 400 })
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription[0].stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/app/configuracoes/billing`
  })
  
  return Response.redirect(session.url)
}
```

### `src/app/(app)/configuracoes/billing/page.tsx`

Página server component:
- Busca subscription do banco (via db query com orgId da sessão)
- Exibe: status atual, plano (mensal/anual), data de renovação
- Botão "Gerenciar assinatura" → `href="/api/billing/portal"`

### `src/components/billing/TrialBanner.tsx`

Client component:
- Props: `{ trialEndsAt: Date | null, status: string }`
- Lógica: se `status !== 'trialing'` → não renderizar
- Se `trialEndsAt` e `daysUntil(trialEndsAt) <= 4` → renderizar banner amarelo
- Texto: "Seu trial expira em X dias — [Assinar agora]"

### Integrar TrialBanner no layout

Em `src/app/(app)/layout.tsx`, adicionar `<TrialBanner>` logo abaixo do `<AppHeader>`, passando `trial_ends_at` e `status` da sessão.

## Arquivos a criar

- `src/app/api/billing/portal/route.ts`
- `src/app/(app)/configuracoes/billing/page.tsx`
- `src/components/billing/TrialBanner.tsx`
- Testes em `src/components/billing/__tests__/`

## Arquivos a modificar

- `src/app/(app)/layout.tsx` — adicionar `TrialBanner`

## Testes

- `TrialBanner` com trial_ends_at = hoje+3 → renderiza "3 dias restantes"
- `TrialBanner` com trial_ends_at = hoje+5 → não renderiza
- `TrialBanner` com status='active' → não renderiza
- `GET /api/billing/portal` sem stripe_customer_id → 400
- Vitest + @testing-library/react
- Meta: ≥80%
