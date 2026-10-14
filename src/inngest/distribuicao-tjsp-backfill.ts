import { inngest } from './client';
import { processDia } from './distribuicao-tjsp-indexer';

/**
 * Inngest function: distribuicaoTjspBackfill
 *
 * Triggered por evento `distribuicao-tjsp/backfill.requested` com payload { dates: string[] }.
 * Processa cada data em steps independentes para visibilidade no painel Inngest.
 *
 * Para disparar (ex.: popular histórico 2026-09-20 a 2026-10-12):
 *   curl -X POST http://localhost:8288/v1/events \
 *     -H "Authorization: Bearer local" \
 *     -H "Content-Type: application/json" \
 *     -d '{"name":"distribuicao-tjsp/backfill.requested","data":{"dates":["2026-09-20","2026-09-21"]}}'
 */
export const distribuicaoTjspBackfill = inngest.createFunction(
  {
    id: 'distribuicao-tjsp-backfill',
    retries: 1,
    concurrency: 1,
    triggers: [{ event: 'distribuicao-tjsp/backfill.requested' }],
  },
  async ({ event, step }) => {
    const dates: string[] = event.data.dates ?? [];
    const sorted = [...dates].sort();

    for (const date of sorted) {
      await step.run(`dia-${date}`, () => processDia(date));
    }

    return { dates: sorted, total: sorted.length };
  },
);
