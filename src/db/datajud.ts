import { eq, desc, sql } from 'drizzle-orm';
import { db } from './index';
import { searches, type SearchFilters } from './schema';

export interface DataJudSearchRecord {
  id: string;
  keyword: string;
  grau: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  totalResults: number;
  createdAt: string;
}

export async function createDataJudSearch(
  userId: string,
  keyword: string,
  grau: string | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined,
  totalResults: number,
): Promise<string> {
  const filters: SearchFilters = {
    assunto: keyword,
    tribunais: ['TJSP'],
    ...(grau ? { classe: grau } : {}),
    ...(dateFrom ? { dataInicio: dateFrom } : {}),
    ...(dateTo ? { dataFim: dateTo } : {}),
  };

  const [row] = await db
    .insert(searches)
    .values({
      userId,
      filters,
      status: 'completed',
      totalTribunals: 1,
      totalResults,
      processedTribunals: ['api_publica_tjsp'],
      completedAt: new Date(),
    })
    .returning({ id: searches.id });
  return row.id;
}

export async function listDataJudSearches(
  userId: string,
  page: number,
  limit: number,
): Promise<{ records: DataJudSearchRecord[]; total: number }> {
  const offset = (page - 1) * limit;

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(searches)
    .where(eq(searches.userId, userId));

  const total = Number(countResult[0].count);
  if (total === 0) return { records: [], total: 0 };

  const rows = await db
    .select()
    .from(searches)
    .where(eq(searches.userId, userId))
    .orderBy(desc(searches.createdAt))
    .limit(limit)
    .offset(offset);

  const records: DataJudSearchRecord[] = rows.map((r) => ({
    id: r.id,
    keyword: (r.filters as Record<string, string> | null)?.assunto ?? '',
    grau: (r.filters as Record<string, string> | null)?.classe ?? null,
    dateFrom: (r.filters as Record<string, string> | null)?.dataInicio ?? null,
    dateTo: (r.filters as Record<string, string> | null)?.dataFim ?? null,
    totalResults: r.totalResults ?? 0,
    createdAt: r.createdAt.toISOString(),
  }));

  return { records, total };
}
