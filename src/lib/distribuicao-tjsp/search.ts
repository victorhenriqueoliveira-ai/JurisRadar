/**
 * Camada compartilhada de busca da Lista de Distribuição TJSP — usada tanto pela
 * busca manual (`/api/busca/distribuicao-tjsp`) quanto pela ferramenta da IA
 * (`/api/busca/distribuicao-tjsp/chat`), para não duplicar a lógica de
 * "indexar sob demanda antes de responder".
 */

import {
  searchDistribuicaoTjspProcessos,
  listDistribuicaoTjspDatasComEdicao,
  type DistribuicaoTjspSearchParams,
} from '@/db/distribuicao-tjsp';
import { processDia } from '@/inngest/distribuicao-tjsp-indexer';

/** Teto de dias indexados "na hora" por busca — evita travar a resposta num range grande. */
const MAX_INDEXACAO_SOB_DEMANDA = 8;

export function defaultDateRange(diasAtras = 30): { dataInicio: string; dataFim: string } {
  const fim = new Date();
  const inicio = new Date();
  inicio.setUTCDate(inicio.getUTCDate() - diasAtras);
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
 * Garante que todas as datas do range tenham ao menos uma tentativa de
 * indexação. Datas sem nenhuma tentativa ainda são processadas agora,
 * sequencialmente, até o teto — o resto fica para o cron diário.
 */
async function ensureDatesIndexed(dataInicio: string, dataFim: string): Promise<{ diasNaoIndexados: string[] }> {
  const todasAsDatas = enumerateDates(dataInicio, dataFim);
  const datasComTentativa = new Set(await listDistribuicaoTjspDatasComEdicao(dataInicio, dataFim));
  const faltantes = todasAsDatas.filter((d) => !datasComTentativa.has(d));

  const aIndexarAgora = faltantes.slice(0, MAX_INDEXACAO_SOB_DEMANDA);
  const diasNaoIndexados = faltantes.slice(MAX_INDEXACAO_SOB_DEMANDA);

  for (const data of aIndexarAgora) {
    await processDia(data);
  }

  return { diasNaoIndexados };
}

export interface BuscaProcessosNovosResult {
  results: Awaited<ReturnType<typeof searchDistribuicaoTjspProcessos>>['results'];
  total: number;
  diasNaoIndexados: string[];
}

/**
 * Busca processos novos, indexando sob demanda as datas do range que ainda
 * não foram tentadas. Ponto de entrada único usado pela busca manual e pela IA.
 */
export async function buscarProcessosNovos(
  params: DistribuicaoTjspSearchParams,
  page = 1,
  limit = 25,
): Promise<BuscaProcessosNovosResult> {
  const { diasNaoIndexados } = await ensureDatesIndexed(params.dataInicio, params.dataFim);
  const { results, total } = await searchDistribuicaoTjspProcessos(params, page, limit);
  return { results, total, diasNaoIndexados };
}
