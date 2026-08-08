import { NextRequest, NextResponse } from 'next/server';
import { getSystemUserId } from '@/lib/system-user';
import { getDjeSearch, searchPublications, createDjeSearch } from '@/db/dje';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSystemUserId();
  const { id } = await params;

  const search = await getDjeSearch(id, userId);
  if (!search) {
    return NextResponse.json({ error: 'Busca não encontrada' }, { status: 404 });
  }

  const searchParamsObj = {
    term: search.term,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  };

  const { total } = await searchPublications(searchParamsObj, 1, 1, userId);

  const newSearchId = await createDjeSearch(
    userId,
    searchParamsObj,
    search.name ?? undefined,
    total,
  );

  return NextResponse.json({ searchId: newSearchId }, { status: 201 });
}
