import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { buscarProcessosNovos, defaultDateRange } from '@/lib/distribuicao-tjsp/search';

export async function GET(request: NextRequest) {
  try {
    await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10) || 25));

  const defaults = defaultDateRange();
  const comarca = searchParams.get('comarca') ?? undefined;
  const classe = searchParams.get('classe') ?? undefined;
  const dataInicio = searchParams.get('dataInicio') ?? defaults.dataInicio;
  const dataFim = searchParams.get('dataFim') ?? defaults.dataFim;

  const { results, total, diasNaoIndexados } = await buscarProcessosNovos(
    { comarca, classe, dataInicio, dataFim },
    page,
    limit,
  );

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json(
    {
      results: results.map((r) => ({
        id: r.id,
        numeroProcesso: r.numeroProcesso,
        comarca: r.comarca,
        vara: r.vara,
        classe: r.classe,
        dataDistribuicao: r.dataDistribuicao,
        linkEsaj: `https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=${encodeURIComponent(
          r.numeroProcesso,
        )}`,
      })),
      total,
      page,
      totalPages,
      diasNaoIndexados, // datas do range que ainda não foram processadas (range grande demais p/ indexar na hora)
    },
    { status: 200 },
  );
}
