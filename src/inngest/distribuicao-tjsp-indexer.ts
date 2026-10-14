/**
 * Inngest function: distribuicaoTjspIndexer
 *
 * Job cron diário que indexa a Lista de Distribuição TJSP (eproc, Primeira
 * Instância/Colégio Recursal) — processos novos distribuídos no dia anterior,
 * de todas as comarcas, independente de quem é o advogado. Fonte: "Processos
 * Novos" (nova aba, não usa a API do DJEN — ver `src/lib/distribuicao-tjsp/`).
 *
 * Pipeline: resolve `codigo` do arquivo → download do PDF → extração posicional
 * (x,y) via pdf-parse → inserção idempotente (UNIQUE em numero_processo).
 *
 * Roda às 11h UTC (8h BRT) — a lista do dia D costuma ser publicada no TJSP em
 * D+1, de madrugada; 8h BRT dá margem segura.
 */

import { eq, and } from 'drizzle-orm';
import { inngest } from './client';
import {
  resolveCodigoArquivo,
  downloadListaDistribuicao,
  DistribuicaoTjspNotFoundError,
} from '@/lib/distribuicao-tjsp/client';
import { parseDistribuicaoTjspPdf } from '@/lib/distribuicao-tjsp/parser';
import {
  createDistribuicaoTjspEdicao,
  updateDistribuicaoTjspEdicaoStatus,
  insertDistribuicaoTjspProcessos,
} from '@/db/distribuicao-tjsp';
import { db } from '@/db';
import { distribuicaoTjspEdicoes } from '@/db/schema';

async function edicaoAlreadyCompleted(dataDistribuicao: string): Promise<boolean> {
  const existing = await db
    .select({ id: distribuicaoTjspEdicoes.id })
    .from(distribuicaoTjspEdicoes)
    .where(
      and(
        eq(distribuicaoTjspEdicoes.dataDistribuicao, dataDistribuicao),
        eq(distribuicaoTjspEdicoes.status, 'completed'),
      ),
    )
    .limit(1);
  return existing.length > 0;
}

/**
 * Pipeline completo para um dia: resolve código → download → parse → persiste.
 * Exportado para testabilidade e reuso no backfill.
 */
export async function processDia(dataDistribuicao: string): Promise<void> {
  console.log(`[distribuicao-tjsp-indexer] started date=${dataDistribuicao}`);

  if (await edicaoAlreadyCompleted(dataDistribuicao)) {
    console.log(`[distribuicao-tjsp-indexer] já indexado para ${dataDistribuicao} — pulando`);
    return;
  }

  const edicaoId = await createDistribuicaoTjspEdicao(dataDistribuicao);
  if (!edicaoId) {
    console.log(`[distribuicao-tjsp-indexer] edição já existe (não-completed) para ${dataDistribuicao} — pulando`);
    return;
  }

  try {
    await updateDistribuicaoTjspEdicaoStatus(edicaoId, 'downloading');
    const codigo = await resolveCodigoArquivo(dataDistribuicao);
    const pdfBuffer = await downloadListaDistribuicao(codigo);

    await updateDistribuicaoTjspEdicaoStatus(edicaoId, 'parsing', codigo);
    const rows = await parseDistribuicaoTjspPdf(pdfBuffer);

    const count = await insertDistribuicaoTjspProcessos(edicaoId, dataDistribuicao, rows);

    await updateDistribuicaoTjspEdicaoStatus(edicaoId, 'completed', codigo, count);
    console.log(`[distribuicao-tjsp-indexer] completed date=${dataDistribuicao} processos=${count}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNotFound = error instanceof DistribuicaoTjspNotFoundError;
    await updateDistribuicaoTjspEdicaoStatus(edicaoId, 'failed', undefined, undefined, errorMessage);
    if (isNotFound) {
      console.log(`[distribuicao-tjsp-indexer] ${dataDistribuicao}: não publicado ainda — ${errorMessage}`);
    } else {
      console.error(`[distribuicao-tjsp-indexer] failed date=${dataDistribuicao} error=${errorMessage}`);
    }
    // Não relança — falha isolada por dia, não deve derrubar o cron
  }
}

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

export const distribuicaoTjspIndexer = inngest.createFunction(
  {
    id: 'distribuicao-tjsp-daily-indexer',
    retries: 2,
    triggers: [
      {
        cron: '0 11 * * *', // 11h UTC = 8h BRT, todos os dias
      },
    ],
  },
  async ({ step }) => {
    const date = yesterdayIso();

    await step.run('index-dia', async () => {
      await processDia(date);
    });

    return { date, message: 'Pipeline Distribuição TJSP concluído' };
  },
);
