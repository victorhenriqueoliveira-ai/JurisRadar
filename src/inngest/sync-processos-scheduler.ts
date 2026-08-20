/**
 * Inngest function: syncProcessosScheduler
 *
 * Cron diário às 6h UTC (3h BRT) que faz fan-out de eventos
 * `processos/sync.requested` para cada advogado com assinatura ativa.
 *
 * Filtra apenas organizações com subscription.status em ('trialing', 'active').
 * Advogados sem OAB registrado são incluídos (o worker trata o caso).
 */

import { inArray, eq } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { orgMembers, users, subscriptions } from '@/db/schema';

// ── Inngest Function ──────────────────────────────────────────────────────────

export const syncProcessosScheduler = inngest.createFunction(
  {
    id: 'sync-processos-scheduler',
    name: 'Sync Processos Scheduler',
    retries: 1,
    triggers: [{ cron: '0 6 * * *' }], // 3h BRT = 6h UTC
  },
  async ({ step }) => {
    // Step 1: buscar todos os advogados com assinatura trialing ou active
    const advogados = await step.run('buscar-advogados-ativos', async () => {
      return db
        .select({
          userId: orgMembers.userId,
          orgId: orgMembers.orgId,
          oabNumero: users.oabNumero,
          oabEstado: users.oabEstado,
        })
        .from(orgMembers)
        .innerJoin(users, eq(orgMembers.userId, users.id))
        .innerJoin(subscriptions, eq(subscriptions.orgId, orgMembers.orgId))
        .where(inArray(subscriptions.status, ['trialing', 'active']));
    });

    console.log(`[sync-processos-scheduler] advogados ativos encontrados: ${advogados.length}`);

    if (advogados.length === 0) {
      return { total: 0, message: 'Nenhum advogado ativo para sincronizar' };
    }

    // Step 2: fan-out — emitir um evento por advogado
    await step.sendEvent(
      'emitir-eventos-sync',
      advogados.map((a) => ({
        name: 'processos/sync.requested' as const,
        data: {
          userId: a.userId,
          orgId: a.orgId,
          oabNumero: a.oabNumero ?? null,
          oabEstado: a.oabEstado ?? null,
        },
      })),
    );

    console.log(`[sync-processos-scheduler] ${advogados.length} eventos emitidos`);

    return { total: advogados.length };
  },
);
