import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getSystemUserId } from '@/lib/system-user';
import { queryTribunal } from '@/lib/datajud/client';
import { createDataJudSearch, listDataJudSearches } from '@/db/datajud';
import { DataJudSearchSchema } from './schema';

const TJSP_TRIBUNAL = 'api_publica_tjsp';

export async function POST(request: NextRequest) {
  const userId = await getSystemUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 422 });
  }

  let parsed: ReturnType<typeof DataJudSearchSchema.parse>;
  try {
    parsed = DataJudSearchSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: err.errors },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 422 });
  }

  const { keyword, grau, dateFrom, dateTo, page, limit } = parsed;
  const from = (page - 1) * limit;

  try {
    const { hits, total } = await queryTribunal(
      TJSP_TRIBUNAL,
      {
        buscaLivre: keyword,
        ...(grau ? { grau: [grau] } : {}),
        ...(dateFrom ? { dataDistribuicaoInicio: dateFrom } : {}),
        ...(dateTo ? { dataDistribuicaoFim: dateTo } : {}),
      },
      from,
      limit,
    );

    if (page === 1) {
      await createDataJudSearch(userId, keyword, grau, dateFrom, dateTo, total).catch(() => {});
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ results: hits, total, page, totalPages }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar DataJud';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const userId = await getSystemUserId();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

  const { records, total } = await listDataJudSearches(userId, page, limit);

  return NextResponse.json({ searches: records, total }, { status: 200 });
}
