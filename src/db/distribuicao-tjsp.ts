import { eq, and, gte, lte, ilike, sql } from 'drizzle-orm';
import { db } from './index';
import { distribuicaoTjspEdicoes, distribuicaoTjspProcessos } from './schema';
import type { DistribuicaoTjspRow } from '@/lib/distribuicao-tjsp/types';

// ── Gerenciamento de Edições ──────────────────────────────────────────────────

/** Cria uma nova edição (dia) com status 'pending'. Retorna `null` se já existir (idempotência via unique). */
export async function createDistribuicaoTjspEdicao(dataDistribuicao: string): Promise<string | null> {
  const [edicao] = await db
    .insert(distribuicaoTjspEdicoes)
    .values({ dataDistribuicao, status: 'pending' })
    .onConflictDoNothing({ target: distribuicaoTjspEdicoes.dataDistribuicao })
    .returning({ id: distribuicaoTjspEdicoes.id });

  return edicao?.id ?? null;
}

export async function getDistribuicaoTjspEdicaoByData(dataDistribuicao: string) {
  const [edicao] = await db
    .select()
    .from(distribuicaoTjspEdicoes)
    .where(eq(distribuicaoTjspEdicoes.dataDistribuicao, dataDistribuicao));
  return edicao ?? null;
}

/**
 * Datas (YYYY-MM-DD) que JÁ possuem edição registrada (qualquer status) dentro
 * do intervalo — usado para descobrir quais datas de um range de busca ainda
 * não foram tentadas (nem com sucesso, nem com falha) e precisam de indexação
 * sob demanda antes da busca responder.
 */
export async function listDistribuicaoTjspDatasComEdicao(
  dataInicio: string,
  dataFim: string,
): Promise<string[]> {
  const rows = await db
    .select({ dataDistribuicao: distribuicaoTjspEdicoes.dataDistribuicao })
    .from(distribuicaoTjspEdicoes)
    .where(and(gte(distribuicaoTjspEdicoes.dataDistribuicao, dataInicio), lte(distribuicaoTjspEdicoes.dataDistribuicao, dataFim)));
  return rows.map((r) => r.dataDistribuicao);
}

export async function updateDistribuicaoTjspEdicaoStatus(
  id: string,
  status: 'pending' | 'downloading' | 'parsing' | 'completed' | 'failed',
  codigoArquivo?: string,
  processCount?: number,
  errorMessage?: string,
): Promise<void> {
  const updateValues: Record<string, unknown> = { status };

  if (codigoArquivo !== undefined) updateValues.codigoArquivo = codigoArquivo;
  if (processCount !== undefined) updateValues.processCount = processCount;
  if (errorMessage !== undefined) updateValues.errorMessage = errorMessage;
  if (status === 'downloading' || status === 'parsing') updateValues.startedAt = new Date();
  if (status === 'completed' || status === 'failed') updateValues.completedAt = new Date();

  await db.update(distribuicaoTjspEdicoes).set(updateValues).where(eq(distribuicaoTjspEdicoes.id, id));
}

// ── Inserção em Batch de Processos ────────────────────────────────────────────

/**
 * Insere processos extraídos em batch. Idempotente via UNIQUE(numero_processo) —
 * processos já indexados (ex.: reprocessamento) são ignorados silenciosamente.
 */
export async function insertDistribuicaoTjspProcessos(
  edicaoId: string,
  dataDistribuicao: string,
  rows: DistribuicaoTjspRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const values = rows.map((r) => ({
    edicaoId,
    numeroProcesso: r.numeroProcesso,
    comarca: r.comarca,
    vara: r.vara,
    classe: r.classe,
    dataDistribuicao,
  }));

  // Neon HTTP tem limite de parâmetros por query — inserir em lotes de 100
  const BATCH_SIZE = 100;
  let total = 0;
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    const result = await db
      .insert(distribuicaoTjspProcessos)
      .values(batch)
      .onConflictDoNothing({ target: distribuicaoTjspProcessos.numeroProcesso })
      .returning({ id: distribuicaoTjspProcessos.id });
    total += result.length;
  }
  return total;
}

// ── Busca ──────────────────────────────────────────────────────────────────────

export interface DistribuicaoTjspSearchParams {
  comarca?: string;
  classe?: string;
  dataInicio: string;
  dataFim: string;
}

export async function searchDistribuicaoTjspProcessos(
  params: DistribuicaoTjspSearchParams,
  page: number,
  limit: number,
): Promise<{ results: (typeof distribuicaoTjspProcessos.$inferSelect)[]; total: number }> {
  const offset = (page - 1) * limit;

  const conditions = [
    gte(distribuicaoTjspProcessos.dataDistribuicao, params.dataInicio),
    lte(distribuicaoTjspProcessos.dataDistribuicao, params.dataFim),
  ];
  if (params.comarca?.trim()) {
    conditions.push(ilike(distribuicaoTjspProcessos.comarca, `%${params.comarca.trim()}%`));
  }
  if (params.classe?.trim()) {
    conditions.push(ilike(distribuicaoTjspProcessos.classe, `%${params.classe.trim()}%`));
  }

  const whereClause = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(distribuicaoTjspProcessos)
    .where(whereClause);
  const total = Number(count);

  if (total === 0) {
    return { results: [], total: 0 };
  }

  const results = await db
    .select()
    .from(distribuicaoTjspProcessos)
    .where(whereClause)
    .orderBy(sql`${distribuicaoTjspProcessos.dataDistribuicao} DESC, ${distribuicaoTjspProcessos.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  return { results, total };
}

/** Lista comarcas distintas já indexadas (para popular o dropdown de filtro). */
export async function listDistribuicaoTjspComarcas(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ comarca: distribuicaoTjspProcessos.comarca })
    .from(distribuicaoTjspProcessos)
    .orderBy(distribuicaoTjspProcessos.comarca);
  return rows.map((r) => r.comarca).filter((c): c is string => Boolean(c));
}

/** Lista classes distintas já indexadas (para popular o dropdown de filtro). */
export async function listDistribuicaoTjspClasses(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ classe: distribuicaoTjspProcessos.classe })
    .from(distribuicaoTjspProcessos)
    .orderBy(distribuicaoTjspProcessos.classe);
  return rows.map((r) => r.classe);
}
