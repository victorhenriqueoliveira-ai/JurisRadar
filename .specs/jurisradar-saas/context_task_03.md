# Contexto — task_03

## Dependências integradas

- **task_02 ✅:** Schema Drizzle expandido com `organizations`, `org_members`, `subscriptions`. Tabela `users` tem `cpf`, `oab_numero`, `oab_estado`, `totp_secret`. Migration aplicada.

## Requisitos do PRD

Auth multi-tenant para advogados. Cadastro com CPF e OAB. Criação automática de organização no primeiro acesso. JWT com orgId + role + subscriptionStatus. 2FA opcional via TOTP.

## Especificação Técnica

### Core Interfaces (TechSpec)

```typescript
// src/types/domain.ts
export type MemberRole = 'socio' | 'associado' | 'estagiario'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

export interface OrgContext {
  orgId: string
  userId: string
  role: MemberRole
}
```

### Helper de contexto multi-tenant

```typescript
// src/lib/org-context.ts
import { auth } from '@/auth'

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

### JWT expandido

Adicionar ao `next-auth.d.ts`:
```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      orgId: string
      role: MemberRole
      subscriptionStatus: SubscriptionStatus
    }
  }
  interface JWT {
    orgId?: string
    role?: string
    subscriptionStatus?: string
  }
}
```

### Fluxo de cadastro

1. Usuário submete email + senha + CPF + OAB
2. Validar CPF (algoritmo dígitos verificadores)
3. Criar usuário em `users`
4. Criar org em `organizations` (slug = slugify(nome) ou email-based)
5. Inserir em `org_members` como `socio`
6. JWT inclui `orgId`, `role: 'socio'`, `subscriptionStatus: 'trialing'`

### 2FA TOTP

- Usar biblioteca `otplib` (já pode estar no projeto, verificar; se não, instalar)
- `src/lib/auth/totp.ts`: `generateSecret()`, `getQrCodeUrl(secret, email)`, `verifyTotp(secret, code)`
- Endpoints: `POST /api/auth/totp/setup` (gera secret + QR), `POST /api/auth/totp/verify`
- `totp_secret` armazenado criptografado em `users.totp_secret`

### Middleware

```typescript
// middleware.ts — adicionar após auth check:
if (token && !token.orgId) {
  return NextResponse.redirect(new URL('/onboarding', request.url))
}
// Verificar subscription para rotas (app):
if (pathname.startsWith('/app') || pathname.startsWith('/(app)')) {
  const status = token?.subscriptionStatus
  if (!['trialing', 'active'].includes(status as string)) {
    return NextResponse.redirect(new URL('/billing', request.url))
  }
}
```

## Arquivos existentes relevantes

- `src/auth.ts` — NextAuth Credentials provider existente, JWT strategy, bcryptjs
- `middleware.ts` — proteção atual de rotas (somente /login excluído)
- `src/db/schema.ts` — tabelas `users`, `organizations`, `org_members` (task_02)
- `src/app/login/` — página de login existente

## Arquivos a criar

- `src/lib/org-context.ts`
- `src/lib/auth/totp.ts`
- `src/lib/auth/cpf.ts`
- `src/app/api/auth/totp/setup/route.ts`
- `src/app/api/auth/totp/verify/route.ts`
- `src/types/domain.ts` (se não existir)
- `next-auth.d.ts` (atualizar ou criar)

## Arquivos a modificar

- `src/auth.ts` — expandir callbacks jwt e session; adicionar campos ao register
- `middleware.ts` — verificação de orgId + subscriptionStatus
- `src/app/login/page.tsx` e/ou `actions.ts` — campos CPF/OAB no cadastro

## Notas importantes

- CPF e OAB NUNCA em logs ou respostas de erro (apenas IDs internos)
- Usar transação Drizzle para criar user + org + member atomicamente
- subscriptionStatus inicial: 'trialing' (14 dias trial, definido no Stripe checkout — task_05)
- Para verificar se orgId está no JWT: checar `token.orgId` no middleware
- Testes: Vitest, mockar `auth()` para testar `requireOrgContext()`
- Meta de cobertura: ≥80%
