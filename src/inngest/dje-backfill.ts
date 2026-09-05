import { inngest } from './client';
import { processCaderno } from './dje-indexer';

/**
 * Inngest function: djeBackfill
 *
 * Triggered by event `dje/backfill.requested` com payload { dates: string[] }.
 * Processa cada data em steps independentes para visibilidade no painel Inngest.
 *
 * Para disparar:
 *   curl -X POST http://localhost:8288/v1/events \
 *     -H "Authorization: Bearer local" \
 *     -H "Content-Type: application/json" \
 *     -d '{"name":"dje/backfill.requested","data":{"dates":["2026-09-03"]}}'
 */
export const djeBackfill = inngest.createFunction(
  {
    id: 'dje-backfill',
    retries: 1,
    concurrency: 1,
    triggers: [{ event: 'dje/backfill.requested' }],
  },
  async ({ event, step }) => {
    const dates: string[] = event.data.dates ?? [];
    const sorted = [...dates].sort(); // do mais antigo ao mais recente

    let success = 0;
    let failed = 0;

    for (const date of sorted) {
      await step.run(`caderno-2-${date}`, () => processCaderno(2, date));
      await step.run(`caderno-3-${date}`, () => processCaderno(3, date));
      success++;
    }

    return { dates: sorted, success, failed };
  },
);
