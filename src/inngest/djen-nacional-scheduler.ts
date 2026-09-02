/**
 * Inngest function: djenNacionalScheduler
 *
 * Cron a cada 4 horas durante dias úteis (8h, 12h, 16h, 20h BRT).
 * Faz fan-out de `djen/sync.requested` para cada advogado com assinatura ativa.
 *
 * O DJEN nacional é atualizado pelos tribunais ao longo do dia,
 * portanto polling 4x/dia captura publicações com latência de ~4h.
 */

import { inArray, eq } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { orgMembers, users, subscriptions } from '@/db/schema';

export const djenNacionalScheduler = inngest.createFunction(
  {
    id: 'djen-nacional-scheduler',
    name: 'DJEN Nacional Scheduler',
    retries: 1,
    triggers: [
      { cron: '0 11,15,19,23 * * 1-5' }, // 8h, 12h, 16h, 20h BRT (UTC-3) = 11h, 15h, 19h, 23h UTC, seg-sex
    ],
  },
  async ({ step }) => {
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

    if (advogados.length === 0) {
      return { total: 0, message: 'Nenhum advogado ativo para sincronizar via DJEN' };
    }

    // Deduplica por (userId, orgId) — um advogado pode ser membro de múltiplas orgs
    const vistos = new Set<string>();
    const unicos = advogados.filter((a) => {
      const key = `${a.userId}:${a.orgId}`;
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    });

    await step.sendEvent(
      'emitir-eventos-djen',
      unicos.map((a) => ({
        name: 'djen/sync.requested' as const,
        data: {
          userId: a.userId,
          orgId: a.orgId,
          oabNumero: a.oabNumero ?? null,
          oabEstado: a.oabEstado ?? null,
        },
      })),
    );

    console.log(`[djen-nacional-scheduler] ${unicos.length} eventos emitidos`);

    return { total: unicos.length };
  },
);
