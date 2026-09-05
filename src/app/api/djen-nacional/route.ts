import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
const TRIBUNAL = 'TJSP';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; JurisRadar/1.0)',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'Referer': 'https://comunica.pje.jus.br/',
  'Origin': 'https://comunica.pje.jus.br',
};

const QuerySchema = z.object({
  texto: z.string().min(2).max(300).optional(),
  nomeParte: z.string().min(2).max(150).optional(),
  numeroProcesso: z.string().min(5).max(50).optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tipoComunicacao: z.enum(['Intimação', 'Citação', 'Edital']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine((d) => d.texto || d.nomeParte || d.numeroProcesso, {
  message: 'Informe um termo de busca, nome da parte ou número do processo',
});

type RawItem = Record<string, unknown>;

function normalizarItem(item: RawItem) {
  return {
    id: item.id,
    data: item.data_disponibilizacao,
    tribunal: item.siglaTribunal,
    tipo: item.tipoComunicacao,
    orgao: item.nomeOrgao,
    classe: item.nomeClasse,
    numeroProcesso: item.numeroprocessocommascara ?? item.numero_processo,
    partes: item.destinatarios,
    advogados: item.destinatarioadvogados,
    link: item.link,
    texto: item.texto,
  };
}

async function fetchDjen(baseParams: URLSearchParams, data?: string): Promise<{ items: RawItem[]; count: number }> {
  const params = new URLSearchParams(baseParams);
  if (data) params.set('dataDisponibilizacao', data);
  const res = await fetch(`${DJEN_BASE}?${params}`, { cache: 'no-store', headers: HEADERS });
  if (!res.ok) throw new Error(`DJEN retornou ${res.status}`);
  const json = await res.json() as { items?: RawItem[]; count?: number };
  return { items: json.items ?? [], count: json.count ?? 0 };
}

function diasUteisNoRange(dateFrom: string, dateTo: string, max = 10): string[] {
  const dias: string[] = [];
  const fim = new Date(dateTo + 'T12:00:00Z');
  const cursor = new Date(dateFrom + 'T12:00:00Z');
  while (cursor <= fim && dias.length < max) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  let parsed: z.infer<typeof QuerySchema>;
  try {
    parsed = QuerySchema.parse({
      texto: sp.get('texto') ?? undefined,
      nomeParte: sp.get('nomeParte') ?? undefined,
      numeroProcesso: sp.get('numeroProcesso') ?? undefined,
      dataInicio: sp.get('dataInicio') ?? undefined,
      dataFim: sp.get('dataFim') ?? undefined,
      tipoComunicacao: sp.get('tipoComunicacao') ?? undefined,
      limit: sp.get('limit') ?? 20,
      offset: sp.get('offset') ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 422 });
  }

  const termoBusca = [parsed.texto, parsed.nomeParte].filter(Boolean).join(' ');

  const baseParams = new URLSearchParams({ siglaTribunal: TRIBUNAL });
  if (parsed.numeroProcesso) {
    baseParams.set('numeroProcesso', parsed.numeroProcesso.replace(/[.\-]/g, ''));
  } else {
    if (termoBusca) baseParams.set('texto', termoBusca);
    if (parsed.tipoComunicacao) baseParams.set('tipoComunicacao', parsed.tipoComunicacao);
  }
  baseParams.set('limit', String(parsed.limit));
  baseParams.set('offset', String(parsed.offset));

  try {
    const temRange = parsed.dataInicio && parsed.dataFim && parsed.dataInicio !== parsed.dataFim;
    const diffDias = temRange
      ? (new Date(parsed.dataFim!).getTime() - new Date(parsed.dataInicio!).getTime()) / 86400000
      : 0;

    // Range curto (≤14 dias): itera dia a dia para cobertura total
    if (temRange && diffDias <= 14) {
      const dias = diasUteisNoRange(parsed.dataInicio!, parsed.dataFim!);
      const allItems: RawItem[] = [];
      let totalCount = 0;
      for (const dia of dias) {
        const { items, count } = await fetchDjen(baseParams, dia);
        allItems.push(...items);
        totalCount += count;
        if (items.length > 0) await new Promise((r) => setTimeout(r, 200));
      }
      return NextResponse.json({
        total: totalCount,
        items: allItems.map(normalizarItem),
        offset: parsed.offset,
        limit: parsed.limit,
      });
    }

    // Range longo (>14 dias) ou sem range: busca única com data âncora ou sem data
    const dataAncora = parsed.dataInicio ?? parsed.dataFim;
    const { items, count } = await fetchDjen(baseParams, dataAncora);

    // Filtro local por dataFim se houver range longo
    const itemsFiltrados = temRange
      ? items.filter((item) => {
          const d = String(item.data_disponibilizacao ?? '').slice(0, 10);
          return d >= parsed.dataInicio! && d <= parsed.dataFim!;
        })
      : items;

    return NextResponse.json({
      total: count,
      items: itemsFiltrados.map(normalizarItem),
      offset: parsed.offset,
      limit: parsed.limit,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao consultar DJEN';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
