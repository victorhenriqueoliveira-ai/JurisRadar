# Contexto — task_08

## Dependências integradas

- **task_02 ✅:** Tabelas `processos`, `movimentacoes`, `notas_processo`, `honorarios` no schema.
- **task_03 ✅:** `requireOrgContext()` e `requireRole()` em `src/lib/org-context.ts`.
- **task_07 ✅:** `src/lib/processos/upsert.ts` criado. `src/inngest/sync-processos-worker.ts`.

## Requisitos

6 endpoints REST do CRM com isolamento multi-tenant por org_id. Tudo via requireOrgContext().

## Endpoints a implementar

### `GET /api/processos` — `src/app/api/processos/route.ts`
Query params: `status`, `area`, `tribunal`, `responsavel_id`, `q` (busca texto), `cursor`, `limit=20`
Response: `{ data: Processo[], nextCursor: string | null, total: number }`
WHERE clause obrigatória: `processos.org_id = ctx.orgId AND processos.arquivado_at IS NULL`

### `GET /api/processos/[id]` — `src/app/api/processos/[id]/route.ts`
Response: processo + últimas 50 movimentações + honorário + notas
Verificar: `processo.org_id === ctx.orgId` → 403 se não

### `PATCH /api/processos/[id]`
Campos: `{ responsavel_id?, status? }`
Papel mínimo: associado (requireRole)

### `DELETE /api/processos/[id]`
Soft delete: `UPDATE SET arquivado_at = now()`
Papel mínimo: associado

### `POST /api/processos/[id]/notas` — `src/app/api/processos/[id]/notas/route.ts`
Body: `{ conteudo: string }` — validar não vazio
Inserir em `notas_processo` com `user_id` e `org_id`

### `DELETE /api/processos/[id]/notas/[notaId]` — `src/app/api/processos/[id]/notas/[notaId]/route.ts`
Regra: apenas o autor da nota OU sócio pode deletar

## Service layer

`src/services/processos.ts` — funções Drizzle reutilizáveis:
```typescript
export async function listProcessos(ctx: OrgContext, filters: ProcessoFilters)
export async function getProcesso(ctx: OrgContext, processoId: string): Promise<ProcessoComMovimentacoes | null>
export async function archiveProcesso(ctx: OrgContext, processoId: string)
export async function updateProcesso(ctx: OrgContext, processoId: string, data: Partial<Processo>)
export async function addNota(ctx: OrgContext, processoId: string, conteudo: string)
export async function deleteNota(ctx: OrgContext, notaId: string)
```

## Arquivos a criar

- `src/app/api/processos/route.ts`
- `src/app/api/processos/[id]/route.ts`
- `src/app/api/processos/[id]/notas/route.ts`
- `src/app/api/processos/[id]/notas/[notaId]/route.ts`
- `src/services/processos.ts`
- Testes em `src/services/__tests__/processos.test.ts`

## Arquivos existentes relevantes

- `src/lib/org-context.ts` — requireOrgContext, requireRole, OrgContext
- `src/lib/errors.ts` — UnauthorizedError, ForbiddenError
- `src/db/schema.ts` — tabelas processos, movimentacoes, notas_processo, honorarios
- `src/lib/processos/upsert.ts` — padrão de query Drizzle a seguir

## Regras críticas

- NUNCA aceitar org_id do request body
- Sempre filtrar por ctx.orgId
- Soft delete (nunca hard delete)
- Retornar 403 (não 404) para processo de outro escritório
- Testes: ≥80% cobertura
