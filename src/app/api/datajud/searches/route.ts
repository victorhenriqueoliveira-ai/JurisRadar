import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { queryTribunal } from '@/lib/datajud/client';
import { DataJudSearchSchema } from './schema';

const TJSP_TRIBUNAL = 'api_publica_tjsp';

/**
 * POST /api/datajud/searches
 *
 * Busca processos no DataJud/TJSP por palavra-chave (1ª instância).
 *
 * Body: { keyword, dateFrom?, dateTo?, page?, limit? }
 *
 * Status HTTP:
 * - 200 — resultados retornados
 * - 401 — não autenticado
 * - 422 — parâmetros inválidos
 * - 502 — DataJud indisponível
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

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

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ results: hits, total, page, totalPages }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar DataJud';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
