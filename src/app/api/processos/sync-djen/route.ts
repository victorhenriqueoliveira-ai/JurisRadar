import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { db } from '@/db';
import { processos, movimentacoes, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
const PAGE_SIZE = 100;
const MAX_PAGES = 10; // máx 1000 publicações por sync

interface DjenItem {
  id: number;
  data_disponibilizacao: string;
  siglaTribunal: string;
  tipoComunicacao: string;
  nomeOrgao: string;
  numero_processo: string;
  numeroprocessocommascara: string;
  nomeClasse?: string;
}

interface DjenResponse {
  count: number;
  items: DjenItem[];
}

async function fetchDjenPage(oabNumero: string, oabEstado: string, pagina: number): Promise<DjenResponse> {
  const params = new URLSearchParams({
    numeroOAB: oabNumero,
    siglaOAB: oabEstado.toUpperCase(),
    pagina: String(pagina),
    qtd: String(PAGE_SIZE),
  });

  const res = await fetch(`${DJEN_BASE}?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; JurisRadar/1.0)',
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`DJEN retornou ${res.status}`);
  return res.json() as Promise<DjenResponse>;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrgContext();

    const body = await request.json().catch(() => ({})) as {
      oabNumero?: string;
      oabEstado?: string;
    };

    let oabNumero = body.oabNumero?.trim();
    let oabEstado = body.oabEstado?.trim();

    // Fallback: lê do perfil do usuário
    if (!oabNumero || !oabEstado) {
      const [user] = await db
        .select({ oabNumero: users.oabNumero, oabEstado: users.oabEstado })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      oabNumero = oabNumero || user?.oabNumero || '';
      oabEstado = oabEstado || user?.oabEstado || '';
    }

    if (!oabNumero || !oabEstado) {
      return NextResponse.json({ error: 'OAB número e estado são obrigatórios' }, { status: 400 });
    }

    // Coleta todas as publicações do DJEN paginando
    const todasPublicacoes: DjenItem[] = [];
    let totalDjen = 0;

    for (let pagina = 1; pagina <= MAX_PAGES; pagina++) {
      const data = await fetchDjenPage(oabNumero, oabEstado, pagina);
      totalDjen = data.count;
      todasPublicacoes.push(...data.items);

      // Para quando não há mais páginas
      if (todasPublicacoes.length >= totalDjen || data.items.length < PAGE_SIZE) break;
    }

    if (todasPublicacoes.length === 0) {
      return NextResponse.json({ processosNovos: 0, processosAtualizados: 0, publicacoes: 0 });
    }

    // Agrupa publicações por número de processo
    const porProcesso = new Map<string, DjenItem[]>();
    for (const item of todasPublicacoes) {
      if (!item.numero_processo) continue;
      const numCnj = item.numeroprocessocommascara || item.numero_processo;
      const existing = porProcesso.get(numCnj) ?? [];
      existing.push(item);
      porProcesso.set(numCnj, existing);
    }

    let processosNovos = 0;
    let processosAtualizados = 0;
    let publicacoesInseridas = 0;
    const now = new Date();

    for (const [numeroCnj, pubs] of Array.from(porProcesso)) {
      const primeiraPublicacao = pubs[0];

      // Verifica se processo já existe
      const existing = await db
        .select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.numeroCnj, numeroCnj), eq(processos.orgId, ctx.orgId)))
        .limit(1);

      let processoId: string;

      if (existing.length > 0) {
        processoId = existing[0].id;
        await db
          .update(processos)
          .set({
            tribunal: primeiraPublicacao.siglaTribunal || undefined,
            ultimaMovimentacao: pubs[pubs.length - 1].tipoComunicacao,
            ultimaSyncAt: now,
            fonteSync: ['djen'],
          })
          .where(eq(processos.id, processoId));
        processosAtualizados++;
      } else {
        const [inserted] = await db
          .insert(processos)
          .values({
            orgId: ctx.orgId,
            numeroCnj,
            tribunal: primeiraPublicacao.siglaTribunal || null,
            areaDireito: primeiraPublicacao.nomeClasse || null,
            status: 'ativo',
            ultimaMovimentacao: pubs[pubs.length - 1].tipoComunicacao,
            ultimaSyncAt: now,
            fonteSync: ['djen'],
          })
          .returning({ id: processos.id });

        processoId = inserted.id;
        processosNovos++;
      }

      // Insere cada publicação como movimentação (idempotente por externoId)
      const movValues = pubs.map((pub: DjenItem) => ({
        orgId: ctx.orgId,
        processoId,
        data: new Date(pub.data_disponibilizacao),
        descricao: `${pub.tipoComunicacao} — ${pub.nomeOrgao}`,
        tipo: pub.tipoComunicacao,
        fonte: 'djen',
        externoId: `djen_${pub.id}`,
      }));

      const BATCH = 50;
      for (let i = 0; i < movValues.length; i += BATCH) {
        const result = await db
          .insert(movimentacoes)
          .values(movValues.slice(i, i + BATCH))
          .onConflictDoNothing()
          .returning({ id: movimentacoes.id });
        publicacoesInseridas += result.length;
      }
    }

    return NextResponse.json({
      processosNovos,
      processosAtualizados,
      publicacoes: publicacoesInseridas,
      total: processosNovos + processosAtualizados,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    console.error('[POST /api/processos/sync-djen]', error);
    return NextResponse.json({ error: 'Erro ao sincronizar via DJEN' }, { status: 500 });
  }
}
