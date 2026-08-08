import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDjeSearch, searchPublications } from '@/db/dje';

/**
 * GET /api/dje/searches/[id]
 *
 * Re-executa ao vivo a query DJE com os parâmetros da busca salva,
 * suportando paginação via query params ?page e ?limit.
 *
 * Retorna 404 se a busca não pertencer ao usuário autenticado
 * (enforcement de ownership via getDjeSearch).
 *
 * Status HTTP:
 * - 200 — resultados retornados
 * - 401 — não autenticado
 * - 404 — busca não encontrada ou pertence a outro usuário
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  const search = await getDjeSearch(id, userId);
  if (!search) {
    return NextResponse.json({ error: 'Busca não encontrada' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50),
  );

  const searchParamsObj = {
    term: search.term,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  };

  const { results, total } = await searchPublications(searchParamsObj, page, limit, userId);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ search, results, total, page, totalPages }, { status: 200 });
}
