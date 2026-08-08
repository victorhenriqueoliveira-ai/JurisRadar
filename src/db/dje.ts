import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from './index';
import { djeEditions, djePublications, djeSearches } from './schema';
import type {
  DjePublication,
  DjeSearchParams,
  DjeSearchResult,
  DjeSearch,
} from '@/lib/dje/types';

// ── Gerenciamento de Edições DJE ──────────────────────────────────────────────

/**
 * Cria uma nova edição do DJE com status 'pending'.
 *
 * @param date - Data da edição no formato "YYYY-MM-DD"
 * @param caderno - Caderno do DJE (2 ou 3)
 * @returns UUID da edição criada
 */
export async function createDjeEdition(
  date: string,
  caderno: 2 | 3,
): Promise<string> {
  const [edition] = await db
    .insert(djeEditions)
    .values({
      editionDate: date,
      caderno,
      status: 'pending',
    })
    .returning({ id: djeEditions.id });

  return edition.id;
}

/**
 * Atualiza o status de processamento de uma edição do DJE.
 *
 * @param id - UUID da edição
 * @param status - Novo status da edição
 * @param publicationCount - Quantidade de publicações indexadas (opcional)
 * @param errorMessage - Mensagem de erro em caso de falha (opcional)
 */
export async function updateDjeEditionStatus(
  id: string,
  status: 'pending' | 'downloading' | 'parsing' | 'completed' | 'failed',
  publicationCount?: number,
  errorMessage?: string,
): Promise<void> {
  const updateValues: Record<string, unknown> = { status };

  if (publicationCount !== undefined) {
    updateValues.publicationCount = publicationCount;
  }

  if (errorMessage !== undefined) {
    updateValues.errorMessage = errorMessage;
  }

  if (status === 'downloading' || status === 'parsing') {
    updateValues.startedAt = new Date();
  }

  if (status === 'completed' || status === 'failed') {
    updateValues.completedAt = new Date();
  }

  await db
    .update(djeEditions)
    .set(updateValues)
    .where(eq(djeEditions.id, id));
}

// ── Inserção em Batch de Publicações ─────────────────────────────────────────

/**
 * Insere publicações do DJE em batch.
 *
 * IMPORTANTE: `search_vector` é uma coluna gerada pelo Postgres — não incluída no INSERT.
 *
 * @param editionId - UUID da edição à qual as publicações pertencem
 * @param publications - Array de publicações a inserir
 * @returns Total de publicações inseridas
 */
export async function insertPublications(
  editionId: string,
  publications: DjePublication[],
): Promise<number> {
  if (publications.length === 0) {
    return 0;
  }

  const rows = publications.map((pub) => ({
    editionId,
    processNumber: pub.processNumber,
    instance: pub.instance,
    court: pub.court,
    publicationDate: pub.publicationDate,
    caderno: pub.caderno,
    content: pub.content,
    // search_vector NÃO incluído — gerado automaticamente pelo Postgres
  }));

  // Neon HTTP tem limite de parâmetros por query — inserir em lotes de 100
  const BATCH_SIZE = 100;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await db.insert(djePublications).values(batch).returning({ id: djePublications.id });
    total += result.length;
  }
  return total;
}

// ── Busca Full-Text com tsvector ──────────────────────────────────────────────

/**
 * Busca publicações do DJE usando full-text search com tsvector.
 *
 * Utiliza `plainto_tsquery('portuguese', ...)` para busca e `ts_headline`
 * para geração de snippets com destaques em `<mark>...</mark>`.
 *
 * @param params - Parâmetros de busca (termo, data inicial e final)
 * @param page - Página de resultados (1-based)
 * @param limit - Número de resultados por página
 * @param userId - ID do usuário (reservado para futuro controle de acesso)
 * @returns Resultados paginados e total de ocorrências
 */
/**
 * Constrói uma tsquery ORando cada palavra individualmente.
 *
 * O dicionário português stems de forma inconsistente adjetivos como
 * "alimentícia" → "alimentíc" (não bate com "aliment"). OR por palavra
 * garante que qualquer forma seja encontrada.
 */
function buildTsquery(term: string) {
  const words = term.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return sql`plainto_tsquery('portuguese', ${term})`;
  }
  let query = sql`plainto_tsquery('portuguese', ${words[0]})`;
  for (let i = 1; i < words.length; i++) {
    query = sql`(${query} || plainto_tsquery('portuguese', ${words[i]}))`;
  }
  return query;
}

export async function searchPublications(
  params: DjeSearchParams,
  page: number,
  limit: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
): Promise<{ results: DjeSearchResult[]; total: number }> {
  const offset = (page - 1) * limit;
  const tsquery = buildTsquery(params.term);

  // Contagem total — sem ts_headline para performance
  const countResult = await db.execute(sql`
    SELECT COUNT(*) as total
    FROM dje_publications
    WHERE search_vector @@ ${tsquery}
      AND publication_date BETWEEN ${params.dateFrom} AND ${params.dateTo}
  `);
  const total = Number((countResult.rows[0] as { total: string }).total);

  if (total === 0) {
    return { results: [], total: 0 };
  }

  // Resultados paginados com snippet (ts_headline aplicado apenas aqui)
  const rowsResult = await db.execute(sql`
    SELECT
      id,
      process_number,
      instance,
      court,
      publication_date,
      caderno,
      ts_headline('portuguese', content, ${tsquery},
        'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS snippet
    FROM dje_publications
    WHERE search_vector @@ ${tsquery}
      AND publication_date BETWEEN ${params.dateFrom} AND ${params.dateTo}
    ORDER BY publication_date DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const results: DjeSearchResult[] = (
    rowsResult.rows as Array<{
      id: string;
      process_number: string;
      instance: '1' | '2';
      court: string | null;
      publication_date: string;
      caderno: number;
      snippet: string;
    }>
  ).map((row) => ({
    id: row.id,
    processNumber: row.process_number,
    instance: row.instance,
    court: row.court,
    publicationDate: row.publication_date,
    caderno: row.caderno as 2 | 3,
    snippet: row.snippet,
  }));

  return { results, total };
}

// ── Histórico de Buscas DJE ───────────────────────────────────────────────────

/**
 * Persiste uma busca DJE no histórico do usuário.
 *
 * @param userId - ID do usuário que realizou a busca
 * @param params - Parâmetros da busca (termo e datas)
 * @param name - Nome opcional para identificar a busca
 * @param totalResults - Total de resultados encontrados
 * @returns UUID do registro de busca criado
 */
export async function createDjeSearch(
  userId: string,
  params: DjeSearchParams,
  name?: string,
  totalResults?: number,
): Promise<string> {
  const [search] = await db
    .insert(djeSearches)
    .values({
      userId,
      term: params.term,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      name: name ?? null,
      totalResults: totalResults ?? 0,
    })
    .returning({ id: djeSearches.id });

  return search.id;
}

/**
 * Busca um registro de histórico DJE pelo ID com validação de ownership.
 *
 * Retorna `null` se o registro não existir ou pertencer a outro usuário.
 *
 * @param id - UUID do registro de busca
 * @param userId - ID do usuário solicitante
 * @returns Registro de busca ou null se não encontrado/sem permissão
 */
export async function getDjeSearch(
  id: string,
  userId: string,
): Promise<DjeSearch | null> {
  const [search] = await db
    .select()
    .from(djeSearches)
    .where(and(eq(djeSearches.id, id), eq(djeSearches.userId, userId)));

  if (!search) {
    return null;
  }

  return {
    id: search.id,
    userId: search.userId,
    name: search.name,
    term: search.term,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    totalResults: search.totalResults,
    executedAt: search.executedAt.toISOString(),
    createdAt: search.createdAt.toISOString(),
  };
}

/**
 * Lista o histórico de buscas DJE de um usuário com paginação.
 *
 * Ordenado por `created_at DESC` (mais recentes primeiro).
 *
 * @param userId - ID do usuário
 * @param page - Página de resultados (1-based)
 * @param limit - Número de resultados por página
 * @returns Buscas paginadas e total de registros
 */
export async function listDjeSearches(
  userId: string,
  page: number,
  limit: number,
): Promise<{ searches: DjeSearch[]; total: number }> {
  const offset = (page - 1) * limit;

  // Contagem total
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(djeSearches)
    .where(eq(djeSearches.userId, userId));

  const total = Number(countResult[0].count);

  if (total === 0) {
    return { searches: [], total: 0 };
  }

  // Resultados paginados
  const rows = await db
    .select()
    .from(djeSearches)
    .where(eq(djeSearches.userId, userId))
    .orderBy(desc(djeSearches.createdAt))
    .limit(limit)
    .offset(offset);

  const searches: DjeSearch[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    term: row.term,
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    totalResults: row.totalResults,
    executedAt: row.executedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));

  return { searches, total };
}
