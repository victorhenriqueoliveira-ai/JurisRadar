/**
 * Inngest function: syncProcessosWorker
 *
 * Consome o evento `processos/sync.requested` e executa o pipeline de
 * importação de processos para um advogado:
 *   1. Busca processos no DataJud por OAB (todos os tribunais relevantes)
 *   2. Upsert em `processos` + insert idempotente em `movimentacoes`
 *   3. Atualiza `ultima_sync_at` de todos os processos sincronizados
 *
 * Erros de rate limit (DataJudRateLimitError) são capturados e registrados
 * sem propagar — o worker segue para o próximo tribunal.
 *
 * Rate limiting: máximo 10 processos/segundo via `step.sleep` entre lotes.
 */

import { inngest } from './client';
import { queryTribunal } from '@/lib/datajud/client';
import { DataJudRateLimitError } from '@/lib/datajud/types';
import { DATAJUD_TRIBUNALS } from '@/lib/datajud/tribunals';
import { upsertProcesso, insertMovimentacoesIdempotente } from '@/lib/processos/upsert';
import type { ProcessoResult } from '@/lib/datajud/types';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Tamanho do lote de processos persistidos por vez (rate limit: 10/s) */
const BATCH_SIZE = 10;

/** Pausa entre lotes para respeitar rate limit de 10 processos/s */
const RATE_LIMIT_SLEEP = '100ms';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Busca processos por OAB em um tribunal específico.
 * Pagina automaticamente até buscar todos os resultados (máx. 1000 por tribunal).
 */
async function buscarProcessosPorOAB(
  tribunal: string,
  oabNumero: string,
): Promise<ProcessoResult[]> {
  const results: ProcessoResult[] = [];
  const PAGE_SIZE = 100;
  let from = 0;
  let total = 0;

  do {
    try {
      const response = await queryTribunal(
        tribunal,
        { oabNumero },
        from,
        PAGE_SIZE,
      );

      results.push(...response.hits);
      total = response.total;
      from += PAGE_SIZE;
    } catch (error) {
      if (error instanceof DataJudRateLimitError) {
        // Propaga para o caller tratar por tribunal
        throw error;
      }
      // Outros erros (5xx, rede): loga e para paginação deste tribunal
      console.error(
        `[sync-processos-worker] erro ao buscar tribunal=${tribunal} from=${from}: ${error instanceof Error ? error.message : String(error)}`,
      );
      break;
    }
  } while (from < Math.min(total, 1000)); // máx 1000 resultados por tribunal

  return results;
}

// ── Inngest Function ──────────────────────────────────────────────────────────

export const syncProcessosWorker = inngest.createFunction(
  {
    id: 'sync-processos-worker',
    name: 'Sync Processos Worker',
    retries: 2,
    concurrency: {
      limit: 5, // máx 5 workers paralelos para não sobrecarregar DataJud
    },
    triggers: [{ event: 'processos/sync.requested' }],
  },
  async ({ event, step }) => {
    const { userId, orgId, oabNumero, oabEstado } = event.data as {
      userId: string;
      orgId: string;
      oabNumero: string | null;
      oabEstado: string | null;
    };

    console.log(
      `[sync-processos-worker] iniciando sync userId=${userId} orgId=${orgId} oab=${oabNumero}/${oabEstado}`,
    );

    if (!oabNumero) {
      console.log(
        `[sync-processos-worker] usuário userId=${userId} não tem OAB registrado — pulando`,
      );
      return { status: 'skipped', reason: 'sem_oab', processosSincronizados: 0 };
    }

    // Step 1: buscar processos no DataJud por OAB
    const processosEncontrados = await step.run('buscar-datajud', async () => {
      const todos: ProcessoResult[] = [];

      for (const tribunal of DATAJUD_TRIBUNALS) {
        try {
          const processos = await buscarProcessosPorOAB(tribunal, oabNumero);
          if (processos.length > 0) {
            console.log(
              `[sync-processos-worker] tribunal=${tribunal} encontrou ${processos.length} processos`,
            );
            todos.push(...processos);
          }
        } catch (error) {
          if (error instanceof DataJudRateLimitError) {
            console.warn(
              `[sync-processos-worker] rate limit atingido no tribunal=${tribunal} — pulando`,
            );
            // Não propaga — continua para o próximo tribunal
          } else {
            console.error(
              `[sync-processos-worker] falha no tribunal=${tribunal}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      return todos;
    });

    console.log(
      `[sync-processos-worker] total de processos encontrados: ${processosEncontrados.length}`,
    );

    if (processosEncontrados.length === 0) {
      return {
        status: 'completed',
        processosSincronizados: 0,
        movimentacoesInseridas: 0,
      };
    }

    // Step 2: persistir processos em lotes (rate limit: 10/s)
    let totalMovimentacoes = 0;
    let totalProcessos = 0;

    const lotes = [];
    for (let i = 0; i < processosEncontrados.length; i += BATCH_SIZE) {
      lotes.push(processosEncontrados.slice(i, i + BATCH_SIZE));
    }

    for (let loteIdx = 0; loteIdx < lotes.length; loteIdx++) {
      const lote = lotes[loteIdx];

      const resultado = await step.run(`persistir-lote-${loteIdx}`, async () => {
        let processosLote = 0;
        let movimentacoesLote = 0;

        for (const processo of lote) {
          try {
            // Upsert do processo
            const { processoId } = await upsertProcesso({
              orgId,
              processo,
              fonteSync: ['datajud'],
            });

            processosLote++;

            // Insert idempotente de movimentações
            if (processo.movimentos && processo.movimentos.length > 0) {
              const movInputs = processo.movimentos.map((mov, idx) => ({
                processoId,
                orgId,
                data: mov.data,
                descricao: mov.descricao,
                tipo: 'movimentacao',
                fonte: 'datajud',
                // externoId: combinação de data + índice para unicidade
                externoId: `datajud-${processo.numero}-${mov.data}-${idx}`,
              }));

              const inserted = await insertMovimentacoesIdempotente(movInputs);
              movimentacoesLote += inserted;
            }
          } catch (error) {
            console.error(
              `[sync-processos-worker] falha ao persistir processo=${processo.numero}: ${error instanceof Error ? error.message : String(error)}`,
            );
            // Não propaga — continua para o próximo processo
          }
        }

        return { processosLote, movimentacoesLote };
      });

      totalProcessos += resultado.processosLote;
      totalMovimentacoes += resultado.movimentacoesLote;

      // Rate limiting: pausa entre lotes (exceto no último)
      if (loteIdx < lotes.length - 1) {
        await step.sleep(`rate-limit-${loteIdx}`, RATE_LIMIT_SLEEP);
      }
    }

    console.log(
      `[sync-processos-worker] sync concluído: processos=${totalProcessos} movimentacoes=${totalMovimentacoes}`,
    );

    return {
      status: 'completed',
      processosSincronizados: totalProcessos,
      movimentacoesInseridas: totalMovimentacoes,
    };
  },
);
