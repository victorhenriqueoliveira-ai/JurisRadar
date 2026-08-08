import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import {
  searchPublications,
  createDjeSearch,
  listDjeSearches,
} from '@/db/dje';
import { DjeSearchSchema } from './schema';

/**
 * POST /api/dje/searches
 *
 * Cria uma nova busca DJE de forma síncrona: valida os parâmetros,
 * executa a busca full-text, persiste o histórico e retorna a página 1
 * dos resultados junto com o searchId.
 *
 * Status HTTP:
 * - 201 — busca criada com sucesso
 * - 401 — não autenticado
 * - 422 — parâmetros inválidos (Zod)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 422 });
  }

  let parsed: ReturnType<typeof DjeSearchSchema.parse>;
  try {
    parsed = DjeSearchSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: err.errors },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 422 });
  }

  const { term, dateFrom, dateTo, name, page, limit } = parsed;
  const params = { term, dateFrom, dateTo };

  // Executa a busca full-text (síncrona)
  const { results, total } = await searchPublications(params, page, limit, userId);

  // Persiste o histórico com o total real de resultados
  const searchId = await createDjeSearch(userId, params, name, total);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json(
    { searchId, results, total, page, totalPages },
    { status: 201 },
  );
}

/**
 * GET /api/dje/searches
 *
 * Retorna o histórico de buscas DJE do usuário autenticado, paginado.
 *
 * Query params:
 * - page (default 1)
 * - limit (default 20)
 *
 * Status HTTP:
 * - 200 — lista retornada
 * - 401 — não autenticado
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20),
  );

  const { searches, total } = await listDjeSearches(userId, page, limit);

  return NextResponse.json({ searches, total }, { status: 200 });
}
