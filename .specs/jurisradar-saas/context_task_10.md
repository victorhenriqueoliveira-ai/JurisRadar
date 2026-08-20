# Contexto — task_10

## Dependências integradas

- **task_02 ✅:** Tabela `notificacoes` no schema com colunas: id, orgId, userId, tipo, titulo, conteudo, processoId, lida, criadoEm.
- **task_03 ✅:** `requireOrgContext()` em `src/lib/org-context.ts`.
- **task_08 ✅:** Padrão de endpoints REST estabelecido em `src/services/processos.ts`.

## Requisitos

Sistema completo de notificações in-app: 4 endpoints + polling no header + painel Sheet.

## Endpoints a criar

### `GET /api/notificacoes` — `src/app/api/notificacoes/route.ts`
Query: `?lida=false&limit=20&cursor=`
WHERE obrigatório: `userId = ctx.userId AND orgId = ctx.orgId`
Response: `{ data: Notificacao[], nextCursor: string | null }`

### `GET /api/notificacoes/count` — `src/app/api/notificacoes/count/route.ts`
Response: `{ count: number }` (apenas não lidas)
Endpoint leve para polling de 30s.

### `PATCH /api/notificacoes/lida-todas` — `src/app/api/notificacoes/lida-todas/route.ts`
UPDATE WHERE userId = ctx.userId AND orgId = ctx.orgId AND lida = false
Response: `{ ok: true, updated: number }`

### `PATCH /api/notificacoes/[id]/lida` — `src/app/api/notificacoes/[id]/lida/route.ts`
Verificar que notificacao.userId === ctx.userId → 403 se não
UPDATE SET lida = true

## Service layer

`src/services/notificacoes.ts`:
```typescript
export async function countNotificacoesNaoLidas(ctx: OrgContext): Promise<number>
export async function listNotificacoes(ctx: OrgContext, filters: NotificacaoFilters)
export async function marcarLida(ctx: OrgContext, notificacaoId: string)
export async function marcarTodasLidas(ctx: OrgContext)
```

## AppHeader — polling

`src/components/layout/AppHeader.tsx` JÁ EXISTE. Adicionar:
- `useEffect` com `setInterval(30000)` que faz fetch de `/api/notificacoes/count`
- `PulsingBadge` no sino com a contagem
- Clicar no sino → abrir `NotificacoesSheet`

## NotificacoesSheet

`src/components/layout/NotificacoesSheet.tsx`:
- shadcn `Sheet` acionado pelo sino
- Lista notificações em ordem cronológica decrescente
- Cada item: ícone por tipo, título, processo relacionado (link para `/app/crm`), data, badge lida/não lida
- Clicar item → `PATCH /:id/lida` + `router.push('/app/crm?processo=ID')`
- Botão "Marcar todas como lidas"

## Página de histórico

`src/app/(app)/notificacoes/page.tsx` — placeholder existe, substituir com listagem completa.

## Arquivos a criar

- `src/app/api/notificacoes/route.ts`
- `src/app/api/notificacoes/count/route.ts`
- `src/app/api/notificacoes/lida-todas/route.ts`
- `src/app/api/notificacoes/[id]/lida/route.ts`
- `src/services/notificacoes.ts`
- `src/components/layout/NotificacoesSheet.tsx`
- `src/services/__tests__/notificacoes.test.ts`

## Arquivos a modificar

- `src/components/layout/AppHeader.tsx` — adicionar polling + badge + NotificacoesSheet

## Regras críticas

- NUNCA retornar notificações de userId diferente do autenticado
- Filtrar SEMPRE por userId + orgId
- 403 ao tentar marcar lida de outro usuário (não 404)
