# Contexto — task_18

## Dependências integradas

- **task_03 ✅:** Middleware redireciona `/onboarding` quando orgId ausente no JWT.
- **task_04 ✅:** Layout (app) criado. `src/components/ui-custom/ImportLoader.tsx` criado (task_01).
- **task_07 ✅:** `POST /api/processos/sync` endpoint para disparar importação.

## Requisitos

Wizard de onboarding em 3 passos sem sidebar. Tour interativo opcional. Marcar conclusão no banco.

## Schema a modificar

Adicionar a `organizations` em `src/db/schema.ts`:
```typescript
onboardingCompletedAt: timestamp('onboarding_completed_at')
```
Gerar e aplicar migration: `pnpm drizzle-kit generate && pnpm drizzle-kit migrate`

## Estrutura de rotas

```
src/app/
└── (onboarding)/
    ├── layout.tsx    ← sem sidebar, sem ThemeProvider complexo
    └── page.tsx      ← wizard com estado local
```

## Componentes

### `(onboarding)/layout.tsx`
Layout mínimo: só `<html><body>{children}</body></html>` sem sidebar, sem header.

### `(onboarding)/page.tsx`
State: `step: 1 | 2 | 3`
Renderizar: `Passo1Escritorio` | `Passo2Importacao` | `Passo3Dashboard`

### `src/components/onboarding/Passo1Escritorio.tsx`
Form: nome do escritório (obrigatório), CNPJ (opcional), área de atuação (select).
Action: `PATCH /api/organizacoes/me` com nome.
Botão "Próximo" → avança para passo 2.

### `src/components/onboarding/Passo2Importacao.tsx`
Campos: OAB número, OAB estado (já podem estar no perfil).
Botão "Importar meus processos": POST `/api/processos/sync`.
Mostrar `ImportLoader` durante importação.
Polling simples: GET `/api/processos?limit=1` a cada 3s por 30s, exibir "Encontramos N processos".
Botão "Pular" para ir direto ao passo 3.

### `src/components/onboarding/Passo3Dashboard.tsx`
Exibir contagem de processos importados.
Botão "Ir para o dashboard" → `router.push('/app/dashboard')` + marcar onboarding completo.
Marcar conclusão: `PATCH /api/onboarding/complete` → seta `onboarding_completed_at`.

### `src/components/onboarding/TourInterativo.tsx`
Tour opcional. Usar `driver.js` (instalar: `pnpm add driver.js`).
Steps: Dashboard → CRM → Calendário → Notificações.
Botão "Pular tour" em qualquer momento.

### `src/app/api/onboarding/complete/route.ts`
```typescript
PATCH: async () => {
  const ctx = await requireOrgContext()
  await db.update(organizations)
    .set({ onboardingCompletedAt: new Date() })
    .where(eq(organizations.id, ctx.orgId))
  return Response.json({ ok: true })
}
```

## Middleware update

No `middleware.ts`, a verificação de `/onboarding` já existe (task_03).
Verificar se já há check de `onboardingCompletedAt` — se não, o redirect para `/onboarding` é suficiente por ora.

## Arquivos a criar

- `src/app/(onboarding)/layout.tsx`
- `src/app/(onboarding)/page.tsx`
- `src/components/onboarding/Passo1Escritorio.tsx`
- `src/components/onboarding/Passo2Importacao.tsx`
- `src/components/onboarding/Passo3Dashboard.tsx`
- `src/components/onboarding/TourInterativo.tsx`
- `src/app/api/onboarding/complete/route.ts`
- Testes em `src/components/onboarding/__tests__/`

## Testes: ≥80% cobertura
