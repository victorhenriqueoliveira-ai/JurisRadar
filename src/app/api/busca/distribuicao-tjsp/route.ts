import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { searchDistribuicaoTjspProcessos, listDistribuicaoTjspDatasComEdicao } from '@/db/distribuicao-tjsp';
import { processDia } from '@/inngest/distribuicao-tjsp-indexer';

/** Janela padrão quando nenhuma data é informada: últimos 30 dias. */
function defaultDateRange(): { dataInicio: string; dataFim: string } {
  const fim = new Date();
  const inicio = new Date();
  inicio.setUTCDate(inicio.getUTCDate() - 30);
  return {
    dataInicio: inicio.toISOString().split('T')[0],
    dataFim: fim.toISOString().split('T')[0],
  };
}

function enumerateDates(dataInicio: string, dataFim: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${dataInicio}T00:00:00Z`);
  const end = new Date(`${dataFim}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Teto de dias indexados "na hora" (sob demanda) por requisição de busca —
 * evita que um range de datas grande (ex.: um ano inteiro) trave a busca por
 * minutos. Dias além do teto ficam para o cron diário pegar depois e são
 * reportados em `diasNaoIndexados` na resposta.
 */
const MAX_INDEXACAO_SOB_DEMANDA = 8;

/**
 * Garante que todas as datas do range tenham ao menos uma tentativa de
 * indexação (sucesso ou falha definitiva, ex.: dia sem publicação). Datas sem
 * NENHUMA tentativa ainda são processadas agora, sequencialmente, até o teto.
 */
async function ensureDatesIndexed(dataInicio: string, dataFim: string): Promise<{ diasNaoIndexados: string[] }> {
  const todasAsDatas = enumerateDates(dataInicio, dataFim);
  const datasComTentativa = new Set(await listDistribuicaoTjspDatasComEdicao(dataInicio, dataFim));
  const faltantes = todasAsDatas.filter((d) => !datasComTentativa.has(d));

  const aIndexarAgora = faltantes.slice(0, MAX_INDEXACAO_SOB_DEMANDA);
  const diasNaoIndexados = faltantes.slice(MAX_INDEXACAO_SOB_DEMANDA);

  for (const data of aIndexarAgora) {
    await processDia(data); // isolado por dia — uma falha não impede as demais
  }

  return { diasNaoIndexados };
}

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

  const { diasNaoIndexados } = await ensureDatesIndexed(dataInicio, dataFim);

  const { results, total } = await searchDistribuicaoTjspProcessos(
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
