/**
 * Inngest function: djenNacionalWorker
 *
 * Consome o evento `djen/sync.requested` emitido pelo djenNacionalScheduler.
 * Para cada advogado com OAB registrado:
 *   1. Busca publicações do DJEN nacional por OAB (multi-tribunal)
 *   2. Upsert de processos no CRM
 *   3. Insert idempotente de movimentações
 *   4. Emite `notificacao/nova` por membro da org para cada movimentação nova
 *
 * Concorrência: máx 5 workers paralelos (throttle pelo scheduler).
 * Idempotência: externoId = 'djen_{pub.id}' — ON CONFLICT DO NOTHING.
 */

import { inArray } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { orgMembers, subscriptions } from '@/db/schema';
import { syncDjenPorOab } from '@/lib/djen/sync';
import type { NotificacaoNovaPayload } from './notificacao-dispatcher';
import { TIPOS_RELEVANTES } from './tipos';

// Tipos de comunicação DJEN que mapeiam para notificação crítica
const TIPO_MAP: Record<string, string> = {
  'intimação': 'intimacao',
  'intimacao': 'intimacao',
  'citação': 'citacao',
  'citacao': 'citacao',
  'edital': 'publicacao_dje',
};

function normalizarTipo(tipo: string): string {
  const lower = tipo.toLowerCase().trim();
  return TIPO_MAP[lower] ?? 'publicacao_dje';
}

export const djenNacionalWorker = inngest.createFunction(
  {
    id: 'djen-nacional-worker',
    name: 'DJEN Nacional Sync Worker',
    retries: 2,
    concurrency: {
      limit: 5,
    },
    triggers: [{ event: 'djen/sync.requested' }],
  },
  async ({ event, step }) => {
    const { userId, orgId, oabNumero, oabEstado } = event.data as {
      userId: string;
      orgId: string;
      oabNumero: string | null;
      oabEstado: string | null;
    };

    if (!oabNumero || !oabEstado) {
      console.log(`[djen-nacional-worker] userId=${userId} sem OAB — pulando`);
      return { skipped: true, reason: 'no_oab' };
    }

    console.log(
      `[djen-nacional-worker] iniciando sync userId=${userId} orgId=${orgId} oab=${oabNumero}/${oabEstado}`,
    );

    // Step 1: buscar e persistir publicações do DJEN
    const resultado = await step.run('sync-djen-oab', async () => {
      return syncDjenPorOab(orgId, oabNumero, oabEstado);
    });

    console.log(
      `[djen-nacional-worker] sync concluído: ${resultado.processosNovos} novos, ${resultado.processosAtualizados} atualizados, ${resultado.novasMovimentacoes.length} movimentações novas`,
    );

    if (resultado.novasMovimentacoes.length === 0) {
      return { ...resultado, notificacoes: 0 };
    }

    // Step 2: buscar membros da org com assinatura ativa
    const membros = await step.run('buscar-membros', async () => {
      const assinatura = await db
        .select({ status: subscriptions.status })
        .from(subscriptions)
        .where(inArray(subscriptions.orgId, [orgId]))
        .limit(1);

      if (!assinatura.length || !['active', 'trialing'].includes(assinatura[0].status)) {
        return [];
      }

      return db
        .select({ userId: orgMembers.userId })
        .from(orgMembers)
        .where(inArray(orgMembers.orgId, [orgId]));
    });

    if (membros.length === 0) {
      return { ...resultado, notificacoes: 0 };
    }

    // Step 3: emitir notificacao/nova para cada (membro, movimentação nova)
    // Só tipos relevantes geram notificação
    const movimentacoesRelevantes = resultado.novasMovimentacoes.filter((m) =>
      (TIPOS_RELEVANTES as readonly string[]).includes(normalizarTipo(m.tipo)),
    );

    if (movimentacoesRelevantes.length === 0) {
      return { ...resultado, notificacoes: 0 };
    }

    const eventos: Array<{ name: string; data: NotificacaoNovaPayload }> = [];

    for (const membro of membros) {
      for (const mov of movimentacoesRelevantes) {
        eventos.push({
          name: 'notificacao/nova' as const,
          data: {
            movimentacaoId: mov.movimentacaoId,
            orgId,
            userId: membro.userId,
            tipo: normalizarTipo(mov.tipo),
            titulo: `${mov.tipo}: ${mov.numeroCnj}`,
            processoId: mov.processoId,
            numeroCnj: mov.numeroCnj,
            tribunal: mov.tribunal,
            descricao: mov.descricao,
          },
        });
      }
    }

    const EVENT_BATCH = 500;
    for (let i = 0; i < eventos.length; i += EVENT_BATCH) {
      await step.sendEvent(`emitir-notificacoes-${i}`, eventos.slice(i, i + EVENT_BATCH));
    }

    console.log(
      `[djen-nacional-worker] ${eventos.length} notificações emitidas para userId=${userId}`,
    );

    return {
      ...resultado,
      notificacoes: eventos.length,
    };
  },
);
