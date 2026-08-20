/**
 * Inngest function: alertasPrazo
 *
 * Executa diariamente às 11h UTC (8h BRT) e envia alertas de prazo
 * para eventos processuais nos marcos T-5, T-2 e T-1 dias.
 *
 * Pipeline por marco T:
 *   1. Buscar eventos com data = hoje + T dias, flag alertado_tT = false
 *      e processo não arquivado (arquivado_at IS NULL)
 *   2. Para cada evento: emitir `notificacao/nova` via step.sendEvent
 *   3. Atualizar flag alertado_tT = true após emit
 *
 * Regras críticas:
 *   - NUNCA enviar alerta para processo com arquivado_at IS NOT NULL
 *   - NUNCA reenviar alerta já marcado (flag = true)
 *   - Atualizar flag APÓS emitir o evento (não antes)
 *   - Cada marco T é um step Inngest separado (idempotência)
 *   - movimentacaoId é null para alertas de prazo (coluna nullable no schema)
 */

import { eq, and, isNull } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { eventosCalendario, processos } from '@/db/schema';

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

export interface EventoComProcesso {
  id: string;
  orgId: string;
  processoId: string;
  titulo: string;
  data: string;
  responsavelId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Retorna a data no formato YYYY-MM-DD adicionando `dias` à data de hoje.
 */
export function calcularDataAlerta(dias: number, hoje: Date = new Date()): string {
  const data = new Date(hoje);
  data.setDate(data.getDate() + dias);
  return data.toISOString().split('T')[0];
}

/**
 * Busca eventos com data exata e flag de alerta não enviada,
 * excluindo processos arquivados.
 */
export async function buscarEventosPorMarco(
  dataAlvo: string,
  flagColuna: 'alertadoT5' | 'alertadoT2' | 'alertadoT1',
): Promise<EventoComProcesso[]> {
  const resultado = await db
    .select({
      id: eventosCalendario.id,
      orgId: eventosCalendario.orgId,
      processoId: eventosCalendario.processoId,
      titulo: eventosCalendario.titulo,
      data: eventosCalendario.data,
      responsavelId: processos.responsavelId,
    })
    .from(eventosCalendario)
    .innerJoin(processos, eq(eventosCalendario.processoId, processos.id))
    .where(
      and(
        eq(eventosCalendario.data, dataAlvo),
        eq(eventosCalendario[flagColuna], false),
        isNull(processos.arquivadoAt),
      ),
    );

  return resultado;
}

/**
 * Atualiza a flag de alerta de um evento para true.
 */
export async function marcarAlertaEnviado(
  eventoId: string,
  flagColuna: 'alertadoT5' | 'alertadoT2' | 'alertadoT1',
): Promise<void> {
  await db
    .update(eventosCalendario)
    .set({ [flagColuna]: true })
    .where(eq(eventosCalendario.id, eventoId));
}

// ── Configuração dos marcos de alerta ─────────────────────────────────────────

export interface MarcoAlerta {
  dias: number;
  flagColuna: 'alertadoT5' | 'alertadoT2' | 'alertadoT1';
  stepId: string;
  label: string;
}

export const MARCOS_ALERTA: MarcoAlerta[] = [
  { dias: 5, flagColuna: 'alertadoT5', stepId: 'alertar-t5', label: 'T-5' },
  { dias: 2, flagColuna: 'alertadoT2', stepId: 'alertar-t2', label: 'T-2' },
  { dias: 1, flagColuna: 'alertadoT1', stepId: 'alertar-t1', label: 'T-1' },
];

// ── Inngest Function ──────────────────────────────────────────────────────────

export const alertasPrazo = inngest.createFunction(
  {
    id: 'alertas-prazo',
    name: 'Alertas de Prazo (T-5, T-2, T-1)',
    retries: 2,
    triggers: [{ cron: '0 11 * * *' }], // 11h UTC = 8h BRT
  },
  async ({ step }) => {
    const hoje = new Date();
    const resultados: Record<string, { processados: number; enviados: number }> = {};

    for (const marco of MARCOS_ALERTA) {
      const dataAlvo = calcularDataAlerta(marco.dias, hoje);

      // Busca eventos para o marco T dentro de um step (idempotência Inngest)
      const eventos = await step.run(marco.stepId, async () => {
        return buscarEventosPorMarco(dataAlvo, marco.flagColuna);
      });

      console.log(
        `[alertas-prazo] ${marco.label}: ${eventos.length} evento(s) em ${dataAlvo}`,
      );

      let enviados = 0;
      const eventsParaEmitir: Array<{ name: string; data: Record<string, unknown> }> = [];

      for (const evento of eventos) {
        const userId = evento.responsavelId;
        if (!userId) {
          console.warn(
            `[alertas-prazo] evento id=${evento.id} sem responsável — pulando`,
          );
          continue;
        }

        eventsParaEmitir.push({
          name: 'notificacao/nova',
          data: {
            orgId: evento.orgId,
            userId,
            tipo: 'prazo_iminente',
            titulo: `Prazo em ${marco.dias} dia${marco.dias > 1 ? 's' : ''}: ${evento.titulo}`,
            processoId: evento.processoId,
            movimentacaoId: null,
            diasRestantes: marco.dias,
          },
        });
      }

      if (eventsParaEmitir.length > 0) {
        // Emitir todos os eventos do marco de uma vez
        await step.sendEvent(
          `emitir-notificacoes-${marco.stepId}`,
          eventsParaEmitir,
        );

        // Atualizar flags após emit — step separado para garantir atomicidade
        await step.run(`atualizar-flags-${marco.stepId}`, async () => {
          for (const evento of eventos) {
            if (!evento.responsavelId) continue;
            await marcarAlertaEnviado(evento.id, marco.flagColuna);
            enviados++;
          }
          return { atualizados: enviados };
        });
      }

      resultados[marco.label] = { processados: eventos.length, enviados };
    }

    console.log('[alertas-prazo] concluído:', JSON.stringify(resultados));
    return { resultados };
  },
);
