import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
const TRIBUNAL = 'TJSP';

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

  // Combina texto livre + nome da parte em um único campo de busca
  const termoBusca = [parsed.texto, parsed.nomeParte].filter(Boolean).join(' ');

  const params = new URLSearchParams({ siglaTribunal: TRIBUNAL });
  if (parsed.numeroProcesso) {
    params.set('numeroProcesso', parsed.numeroProcesso.replace(/[.\-]/g, ''));
  } else {
    if (termoBusca) params.set('texto', termoBusca);
    // A API só aceita uma data; se houver intervalo, usa a data de início como âncora
    if (parsed.dataInicio) params.set('dataDisponibilizacao', parsed.dataInicio);
    else if (parsed.dataFim) params.set('dataDisponibilizacao', parsed.dataFim);
  }
  if (parsed.tipoComunicacao) params.set('tipoComunicacao', parsed.tipoComunicacao);
  params.set('limit', String(parsed.limit));
  params.set('offset', String(parsed.offset));

  try {
    const res = await fetch(`${DJEN_BASE}?${params}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JurisRadar/1.0)',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://comunica.pje.jus.br/',
        'Origin': 'https://comunica.pje.jus.br',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `DJEN retornou ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    let items = (data.items ?? []) as Record<string, unknown>[];

    // Filtro local por data fim (a API não suporta intervalo nativo)
    if (parsed.dataFim && parsed.dataInicio && parsed.dataInicio !== parsed.dataFim) {
      items = items.filter((item) => {
        const d = String(item.data_disponibilizacao ?? '');
        return d >= parsed.dataInicio! && d <= parsed.dataFim!;
      });
    }

    return NextResponse.json({
      total: data.count ?? 0,
      items: items.map((item) => ({
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
      })),
      offset: parsed.offset,
      limit: parsed.limit,
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar DJEN' }, { status: 502 });
  }
}
