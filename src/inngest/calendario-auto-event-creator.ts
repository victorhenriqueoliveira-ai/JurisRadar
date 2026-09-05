/**
 * Inngest function: calendarioAutoEventCreator
 *
 * Consome `notificacao/nova` emitido pelo pipeline DJE/DJEN e cria
 * automaticamente um evento em `eventos_calendario` quando tipo for
 * 'intimacao' ou 'audiencia'. Idempotente por (processo_id, tipo, data).
 *
 * Não modifica dje-processo-matcher.ts nem notificacao-dispatcher.ts.
 */

import { and, eq } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { eventosCalendario, processos } from '@/db/schema';
import type { NotificacaoNovaPayload } from './notificacao-dispatcher';

const TIPOS_CALENDARIO = ['intimacao', 'audiencia'] as const;

export const calendarioAutoEventCreator = inngest.createFunction(
  {
    id: 'calendario-auto-event-creator',
    name: 'Calendário — Auto Event Creator (DJE/DJEN)',
    triggers: [{ event: 'notificacao/nova' }],
  },
  async ({ event, step }) => {
    const payload = event.data as NotificacaoNovaPayload;
    const { tipo, processoId, orgId, titulo } = payload;

    if (!(TIPOS_CALENDARIO as readonly string[]).includes(tipo)) {
      console.log(`[calendario-auto-event-creator] tipo=${tipo} ignorado — não cria evento`);
      return { skipped: true, reason: 'tipo_nao_elegivel' };
    }

    if (!processoId) {
      console.warn('[calendario-auto-event-creator] processoId ausente — descartando');
      return { skipped: true, reason: 'processo_id_ausente' };
    }

    return await step.run('criar-evento-calendario', async () => {
      const dataEvento = new Date().toISOString().slice(0, 10);

      // Idempotência: verificar se já existe evento com mesmo processo+tipo+data
      const existente = await db
        .select({ id: eventosCalendario.id })
        .from(eventosCalendario)
        .where(
          and(
            eq(eventosCalendario.processoId, processoId),
            eq(eventosCalendario.tipo, tipo),
            eq(eventosCalendario.data, dataEvento),
          ),
        )
        .limit(1);

      if (existente.length > 0) {
        console.log(
          `[calendario-auto-event-creator] evento duplicado ignorado id=${existente[0].id}`,
        );
        return { skipped: true, reason: 'duplicata', existenteId: existente[0].id };
      }

      // Buscar responsavel_id do processo
      const processo = await db
        .select({ responsavelId: processos.responsavelId })
        .from(processos)
        .where(eq(processos.id, processoId))
        .limit(1);

      if (processo.length === 0) {
        console.warn(
          `[calendario-auto-event-creator] processo id=${processoId} não encontrado — descartando`,
        );
        return { skipped: true, reason: 'processo_nao_encontrado' };
      }

      const [novoEvento] = await db
        .insert(eventosCalendario)
        .values({
          orgId,
          processoId,
          tipo,
          titulo: titulo || `${tipo} detectada pelo DJE/DJEN`,
          data: dataEvento,
          responsavelId: processo[0].responsavelId ?? null,
          origem: 'djen',
        })
        .returning({ id: eventosCalendario.id });

      console.log(
        `[calendario-auto-event-creator] evento criado id=${novoEvento.id} tipo=${tipo} processo=${processoId}`,
      );

      return { created: true, eventoId: novoEvento.id };
    });
  },
);
