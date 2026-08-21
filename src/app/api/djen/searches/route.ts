import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const params = new URLSearchParams({
    siglaTribunal: searchParams.get('siglaTribunal') ?? 'TJSP',
    limit: searchParams.get('limit') ?? '20',
    offset: searchParams.get('offset') ?? '0',
  });

  const numeroProcesso = searchParams.get('numeroProcesso');
  const texto = searchParams.get('q') ?? searchParams.get('texto');
  const dataDisponibilizacao = searchParams.get('dataInicio') ?? searchParams.get('dataDisponibilizacao');
  const tipoComunicacao = searchParams.get('tipoComunicacao');

  if (numeroProcesso) params.set('numeroProcesso', numeroProcesso.replace(/[.\-/]/g, ''));
  if (texto) params.set('texto', texto);
  if (dataDisponibilizacao) params.set('dataDisponibilizacao', dataDisponibilizacao);
  if (tipoComunicacao) params.set('tipoComunicacao', tipoComunicacao);

  try {
    const res = await fetch(`${BASE}?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; JurisRadar/1.0)',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `DJEN retornou ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Falha ao conectar com a API do DJEN' }, { status: 502 });
  }
}
