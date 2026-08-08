import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDjeSearch, searchPublications, createDjeSearch } from '@/db/dje';

/**
 * POST /api/dje/searches/[id]/rerun
 *
 * Cria uma nova entrada em dje_searches com os mesmos parâmetros (term,
 * dateFrom, dateTo) da busca original e retorna 201 com o novo searchId.
 *
 * Status HTTP:
 * - 201 — nova busca criada com sucesso
 * - 401 — não autenticado
 * - 404 — busca original não encontrada ou pertence a outro usuário
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  // Verifica ownership — retorna null se não pertencer ao usuário
  const search = await getDjeSearch(id, userId);
  if (!search) {
    return NextResponse.json({ error: 'Busca não encontrada' }, { status: 404 });
  }

  const searchParamsObj = {
    term: search.term,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  };

  // Executa a query para contar o total atual de resultados
  const { total } = await searchPublications(searchParamsObj, 1, 1, userId);

  // Cria nova entrada com os mesmos parâmetros
  const newSearchId = await createDjeSearch(
    userId,
    searchParamsObj,
    search.name ?? undefined,
    total,
  );

  return NextResponse.json({ searchId: newSearchId }, { status: 201 });
}
