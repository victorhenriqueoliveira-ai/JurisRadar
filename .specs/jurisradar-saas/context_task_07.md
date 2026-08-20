# Contexto — task_07

## Dependências integradas

- **task_02 ✅:** Tabelas `processos`, `movimentacoes` no schema Drizzle.
- **task_03 ✅:** `requireOrgContext()`, auth com orgId/OAB no JWT.
- **task_05 ✅:** Tabela `subscriptions` com status. Lógica de billing ativa.

## Requisitos

Importação automática via Inngest + DataJud/PJe. Scheduler cron + worker por advogado. Persistência com upsert. Sync manual via endpoint.

## Arquivos existentes relevantes (LER ANTES)

- `src/inngest/client.ts` — cliente Inngest existente; verificar como registrar funções
- `src/inngest/` — funções existentes (ex: DJe cron); seguir o mesmo padrão
- `src/lib/datajud/client.ts` — cliente DataJud com retry (reutilizar INTEGRALMENTE)
- `src/lib/datajud/query-builder.ts` — builder de queries
- `src/app/api/djen-nacional/route.ts` — integração PJe/Comunica existente
- `src/db/schema.ts` — tabelas `processos`, `movimentacoes`, `organizations`, `org_members`, `subscriptions`, `users`

## Especificação Técnica

### `src/inngest/sync-processos-scheduler.ts`

```typescript
export const syncProcessosScheduler = inngest.createFunction(
  { id: 'sync-processos-scheduler', name: 'Sync Processos Scheduler' },
  { cron: '0 6 * * *' }, // 3h BRT = 6h UTC
  async ({ step }) => {
    // Buscar todos os advogados com assinatura trialing ou active
    const advogados = await step.run('buscar-advogados-ativos', async () => {
      return db.select({ userId: orgMembers.userId, orgId: orgMembers.orgId, oabNumero: users.oabNumero, oabEstado: users.oabEstado })
        .from(orgMembers)
        .innerJoin(users, eq(orgMembers.userId, users.id))
        .innerJoin(subscriptions, eq(subscriptions.orgId, orgMembers.orgId))
        .where(inArray(subscriptions.status, ['trialing', 'active']))
    })
    // Fan-out: emitir evento por advogado
    await step.sendEvent('emitir-eventos-sync', advogados.map(a => ({
      name: 'processos/sync.requested',
      data: { userId: a.userId, orgId: a.orgId, oabNumero: a.oabNumero, oabEstado: a.oabEstado }
    })))
    return { total: advogados.length }
  }
)
```

### `src/inngest/sync-processos-worker.ts`

```typescript
export const syncProcessosWorker = inngest.createFunction(
  { id: 'sync-processos-worker', name: 'Sync Processos Worker' },
  { event: 'processos/sync.requested' },
  async ({ event, step }) => {
    const { userId, orgId, oabNumero, oabEstado } = event.data
    
    // Step 1: buscar processos no DataJud por OAB
    const processosDataJud = await step.run('buscar-datajud', async () => {
      // usar datajud client existente, busca por OAB
    })
    
    // Step 2: upsert em processos + insert movimentacoes
    const resultado = await step.run('persistir-processos', async () => {
      // upsert via ON CONFLICT DO NOTHING
    })
    
    // Step 3: buscar no PJe por número CNJ dos processos importados
    // (opcional na v1.0, usar comunicaapi.pje.jus.br)
    
    // Step 4: atualizar ultima_sync_at
    return resultado
  }
)
```

### Upsert de processos

```typescript
// src/lib/processos/upsert.ts
await db.insert(processos).values(processoData)
  .onConflictDoUpdate({
    target: [processos.numeroCnj, processos.orgId],
    set: { ultimaSync_at: new Date(), ultimaMovimentacao: processoData.ultimaMovimentacao }
  })

// Movimentações: ON CONFLICT DO NOTHING na coluna externo_id
await db.insert(movimentacoes).values(movData)
  .onConflictDoNothing()
```

### `POST /api/processos/sync`

Rota manual para disparar sync. Requer auth. Emite evento Inngest `processos/sync.requested` para o usuário atual.

```typescript
// src/app/api/processos/sync/route.ts
export async function POST() {
  const ctx = await requireOrgContext()
  await inngest.send({ name: 'processos/sync.requested', data: { userId: ctx.userId, orgId: ctx.orgId } })
  return Response.json({ status: 'sync_triggered' })
}
```

## Registrar as funções no Inngest

Verificar onde as funções existentes são registradas (provavelmente `src/app/api/inngest/route.ts`) e adicionar as duas novas.

## Rate limiting

Usar `step.sleep('rate-limit', '100ms')` entre lotes de processos para não exceder 10/segundo.

## Testes

- Mockar `datajud/client.ts` e `inngest.send`
- Testar upsert com mesmo numero_cnj (não duplica)
- Testar filtro de subscription inativa
- Vitest + mocks
- Meta: ≥80% cobertura
