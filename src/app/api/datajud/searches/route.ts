import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { queryTribunal } from '@/lib/datajud/client';
import { createDataJudSearch, listDataJudSearches } from '@/db/datajud';
import { DataJudSearchSchema } from './schema';

const TJSP_TRIBUNAL = 'api_publica_tjsp';

/**
 * POST /api/datajud/searches
 *
 * Busca processos no DataJud/TJSP por palavra-chave, salva no histórico e retorna resultados.
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

    // Salva no histórico apenas na primeira página
    if (page === 1) {
      await createDataJudSearch(userId, keyword, grau, dateFrom, dateTo, total).catch(() => {
        // Falha ao salvar histórico não interrompe a resposta
      });
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ results: hits, total, page, totalPages }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar DataJud';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * GET /api/datajud/searches
 *
 * Retorna o histórico de buscas DataJud do usuário autenticado.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

  const { records, total } = await listDataJudSearches(session.user.id, page, limit);

  return NextResponse.json({ searches: records, total }, { status: 200 });
}
