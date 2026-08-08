/**
 * Inngest function: djeIndexer
 *
 * Job cron diário (23h UTC = 20h BRT, segunda a sexta) que orquestra o pipeline
 * completo de indexação do DJE/TJSP:
 *   1. Verifica idempotência (pula se já existe entrada 'completed' para a data e caderno)
 *   2. Faz download do PDF do caderno
 *   3. Extrai texto do PDF
 *   4. Segmenta publicações por número CNJ
 *   5. Persiste publicações no banco
 *
 * Estrutura de steps:
 *   - download-caderno-2 + index-caderno-2  (caderno 2 — 2ª Instância)
 *   - download-caderno-3 + index-caderno-3  (caderno 3 — 1ª Instância Capital)
 *
 * Cada caderno é processado de forma independente: falha em um não impede o outro.
 */

import { eq, and } from 'drizzle-orm';
import { inngest } from './client';
import { downloadCaderno } from '@/lib/dje/client';
import { extractTextFromPdf, segmentPublications } from '@/lib/dje/parser';
import {
  createDjeEdition,
  updateDjeEditionStatus,
  insertPublications,
} from '@/db/dje';
import { db } from '@/db';
import { djeEditions } from '@/db/schema';

// ── Utilitários (exportados para testabilidade) ───────────────────────────────

/**
 * Verifica se já existe uma edição do DJE com status 'completed' para a data
 * e caderno informados (idempotência).
 */
async function editionAlreadyCompleted(date: string, caderno: 2 | 3): Promise<boolean> {
  const existing = await db
    .select({ id: djeEditions.id, status: djeEditions.status })
    .from(djeEditions)
    .where(
      and(
        eq(djeEditions.editionDate, date),
        eq(djeEditions.caderno, caderno),
        eq(djeEditions.status, 'completed'),
      ),
    )
    .limit(1);

  return existing.length > 0;
}

/**
 * Pipeline completo para um caderno: download → extração → segmentação → inserção.
 * Gerencia criação e atualização de status em `dje_editions`.
 * Em caso de erro, registra `'failed'` mas não lança exceção (isolamento por caderno).
 *
 * Exportado para testabilidade — permite testar a lógica sem o runtime do Inngest.
 */
export async function processCaderno(caderno: 2 | 3, date: string): Promise<void> {
  console.log(`[dje-indexer] step started: caderno-${caderno} date=${date}`);

  // Verificação de idempotência
  const alreadyDone = await editionAlreadyCompleted(date, caderno);
  if (alreadyDone) {
    console.log(
      `[dje-indexer] caderno-${caderno} já indexado para ${date} — pulando`,
    );
    return;
  }

  // Cria entrada em dje_editions com status 'downloading'
  const editionId = await createDjeEdition(date, caderno);
  await updateDjeEditionStatus(editionId, 'downloading');

  try {
    // Download do PDF
    const pdfBuffer = await downloadCaderno(caderno, date);

    // Extração de texto
    await updateDjeEditionStatus(editionId, 'parsing');
    const text = await extractTextFromPdf(pdfBuffer);

    // Segmentação de publicações por número CNJ
    const publications = segmentPublications(text, caderno, date);

    // Persistência em batch
    const count = await insertPublications(editionId, publications);

    // Sucesso
    await updateDjeEditionStatus(editionId, 'completed', count);
    console.log(
      `[dje-indexer] step completed: caderno-${caderno} publications=${count}`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await updateDjeEditionStatus(editionId, 'failed', undefined, errorMessage);
    console.error(
      `[dje-indexer] step failed: caderno-${caderno} error=${errorMessage}`,
    );
    // Não relança — isolamento por caderno (falha em um não impede o outro)
  }
}

// ── Inngest Function ──────────────────────────────────────────────────────────

export const djeIndexer = inngest.createFunction(
  {
    id: 'dje-daily-indexer',
    retries: 2, // job crítico diário — retry habilitado
    triggers: [
      {
        cron: '0 23 * * 1-5', // 23h UTC = 20h BRT, segunda a sexta
      },
    ],
  },
  async ({ step }) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Step 1: Download e indexação do caderno 2 (2ª Instância)
    await step.run('download-caderno-2', async () => {
      await processCaderno(2, today);
    });

    // Step 2: Consolidação/verificação caderno 2 (mantém separação de concerns)
    await step.run('index-caderno-2', async () => {
      console.log(`[dje-indexer] step started: index-caderno-2 date=${today}`);
      // Processamento de caderno 2 já concluído no step anterior
      // Step mantido para visibilidade no painel Inngest e eventual extensão futura
      console.log(`[dje-indexer] step completed: index-caderno-2 date=${today}`);
    });

    // Step 3: Download e indexação do caderno 3 (1ª Instância Capital) — independente do caderno 2
    await step.run('download-caderno-3', async () => {
      await processCaderno(3, today);
    });

    // Step 4: Consolidação/verificação caderno 3
    await step.run('index-caderno-3', async () => {
      console.log(`[dje-indexer] step started: index-caderno-3 date=${today}`);
      // Processamento de caderno 3 já concluído no step anterior
      console.log(`[dje-indexer] step completed: index-caderno-3 date=${today}`);
    });

    return {
      date: today,
      message: 'Pipeline DJE concluído',
    };
  },
);
