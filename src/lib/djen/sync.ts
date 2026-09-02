/**
 * Lógica central de sincronização do DJEN Nacional por OAB.
 *
 * Busca todas as publicações do advogado na API `comunicaapi.pje.jus.br`,
 * faz upsert de processos e insert idempotente de movimentações.
 * Retorna IDs das movimentações novas para emissão de notificações.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { processos, movimentacoes } from '@/db/schema';

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
const PAGE_SIZE = 100;
const MAX_PAGES = 10; // máx 1000 publicações por sync

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface DjenItem {
  id: number;
  data_disponibilizacao: string;
  siglaTribunal: string;
  tipoComunicacao: string;
  nomeOrgao: string;
  numero_processo: string;
  numeroprocessocommascara: string;
  nomeClasse?: string;
  texto?: string;
}

export interface DjenSyncResult {
  processosNovos: number;
  processosAtualizados: number;
  publicacoesTotal: number;
  novasMovimentacoes: Array<{
    movimentacaoId: string;
    processoId: string;
    numeroCnj: string;
    tribunal: string;
    tipo: string;
    descricao: string;
  }>;
}

// ── Fetch paginado ─────────────────────────────────────────────────────────────

async function fetchDjenPage(oabNumero: string, oabEstado: string, pagina: number): Promise<{ count: number; items: DjenItem[] }> {
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
  return res.json() as Promise<{ count: number; items: DjenItem[] }>;
}

// ── Sync principal ─────────────────────────────────────────────────────────────

export async function syncDjenPorOab(
  orgId: string,
  oabNumero: string,
  oabEstado: string,
): Promise<DjenSyncResult> {
  // Coleta todas as publicações paginando
  const todasPublicacoes: DjenItem[] = [];
  let totalDjen = 0;

  for (let pagina = 1; pagina <= MAX_PAGES; pagina++) {
    const data = await fetchDjenPage(oabNumero, oabEstado, pagina);
    totalDjen = data.count;
    todasPublicacoes.push(...data.items);
    if (todasPublicacoes.length >= totalDjen || data.items.length < PAGE_SIZE) break;
  }

  if (todasPublicacoes.length === 0) {
    return { processosNovos: 0, processosAtualizados: 0, publicacoesTotal: 0, novasMovimentacoes: [] };
  }

  // Agrupa por número CNJ
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
  const novasMovimentacoes: DjenSyncResult['novasMovimentacoes'] = [];
  const now = new Date();

  for (const [numeroCnj, pubs] of Array.from(porProcesso)) {
    const primeiraPublicacao = pubs[0];

    // Upsert do processo
    const existing = await db
      .select({ id: processos.id })
      .from(processos)
      .where(and(eq(processos.numeroCnj, numeroCnj), eq(processos.orgId, orgId)))
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
          orgId,
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

    // Insert idempotente de movimentações — ON CONFLICT DO NOTHING
    const movValues = pubs.map((pub) => ({
      orgId,
      processoId,
      data: new Date(pub.data_disponibilizacao),
      descricao: `${pub.tipoComunicacao} — ${pub.nomeOrgao}`,
      tipo: pub.tipoComunicacao.toLowerCase().replace(/\s+/g, '_'),
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

      // Somente movimentações realmente novas viram notificações
      for (let j = 0; j < result.length; j++) {
        const pub = pubs[i + j];
        if (!pub) continue;
        novasMovimentacoes.push({
          movimentacaoId: result[j].id,
          processoId,
          numeroCnj,
          tribunal: primeiraPublicacao.siglaTribunal ?? 'Tribunal não informado',
          tipo: movValues[i + j].tipo,
          descricao: movValues[i + j].descricao,
        });
      }
    }
  }

  return {
    processosNovos,
    processosAtualizados,
    publicacoesTotal: todasPublicacoes.length,
    novasMovimentacoes,
  };
}
