import { NextRequest, NextResponse } from 'next/server';
import { getSystemUserId } from '@/lib/system-user';
import { getDjeSearch, searchPublications } from '@/db/dje';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSystemUserId();
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
