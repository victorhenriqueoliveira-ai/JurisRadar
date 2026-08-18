import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
const TRIBUNAL = 'TJSP';

const QuerySchema = z.object({
  texto: z.string().min(2).max(300).optional(),
  numeroProcesso: z.string().min(5).max(50).optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tipoComunicacao: z.enum(['Intimação', 'Citação', 'Edital']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine((d) => d.texto || d.numeroProcesso, {
  message: 'Informe um termo de busca ou número do processo',
});

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  let parsed: z.infer<typeof QuerySchema>;
  try {
    parsed = QuerySchema.parse({
      texto: sp.get('texto') ?? undefined,
      numeroProcesso: sp.get('numeroProcesso') ?? undefined,
      data: sp.get('data') ?? undefined,
      tipoComunicacao: sp.get('tipoComunicacao') ?? undefined,
      limit: sp.get('limit') ?? 20,
      offset: sp.get('offset') ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 422 });
  }

  const params = new URLSearchParams({ siglaTribunal: TRIBUNAL });
  if (parsed.texto) params.set('texto', parsed.texto);
  if (parsed.numeroProcesso) params.set('numeroProcesso', parsed.numeroProcesso.replace(/[.\-]/g, ''));
  if (parsed.data) params.set('dataDisponibilizacao', parsed.data);
  if (parsed.tipoComunicacao) params.set('tipoComunicacao', parsed.tipoComunicacao);
  params.set('limit', String(parsed.limit));
  params.set('offset', String(parsed.offset));

  try {
    const res = await fetch(`${DJEN_BASE}?${params}`, {
      headers: { 'User-Agent': 'JurisRadar/1.0' },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `DJEN retornou ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({
      total: data.count ?? 0,
      items: (data.items ?? []).map((item: Record<string, unknown>) => ({
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
