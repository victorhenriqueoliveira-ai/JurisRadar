/**
 * Recebe publicações do DJEN já buscadas pelo browser (que não sofre bloqueio de IP)
 * e as persiste no banco. Mesma lógica de sync-djen, mas sem o fetch externo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { processos, movimentacoes, users } from '@/db/schema';

export const runtime = 'nodejs';

interface DjenItem {
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

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrgContext();

    const body = await request.json() as {
      items: DjenItem[];
      oabNumero?: string;
      oabEstado?: string;
    };

    const items: DjenItem[] = body.items ?? [];

    // Persiste OAB no perfil se informado
    if (body.oabNumero && body.oabEstado) {
      await db.update(users)
        .set({ oabNumero: body.oabNumero, oabEstado: body.oabEstado })
        .where(eq(users.id, ctx.userId));
    }

    if (items.length === 0) {
      return NextResponse.json({ processosNovos: 0, processosAtualizados: 0, total: 0 });
    }

    // Agrupa por número CNJ
    const porProcesso = new Map<string, DjenItem[]>();
    for (const item of items) {
      if (!item.numero_processo) continue;
      const numCnj = item.numeroprocessocommascara || item.numero_processo;
      porProcesso.set(numCnj, [...(porProcesso.get(numCnj) ?? []), item]);
    }

    let processosNovos = 0;
    let processosAtualizados = 0;
    const now = new Date();
    const orgId = ctx.orgId;

    for (const [numeroCnj, pubs] of Array.from(porProcesso)) {
      const primeira = pubs[0];

      const existing = await db
        .select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.numeroCnj, numeroCnj), eq(processos.orgId, orgId)))
        .limit(1);

      let processoId: string;

      if (existing.length > 0) {
        processoId = existing[0].id;
        await db.update(processos)
          .set({
            tribunal: primeira.siglaTribunal || undefined,
            ultimaMovimentacao: pubs[pubs.length - 1].tipoComunicacao,
            ultimaSyncAt: now,
            fonteSync: ['djen'],
          })
          .where(eq(processos.id, processoId));
        processosAtualizados++;
      } else {
        const [inserted] = await db.insert(processos)
          .values({
            orgId,
            numeroCnj,
            tribunal: primeira.siglaTribunal || null,
            areaDireito: primeira.nomeClasse || null,
            status: 'ativo',
            ultimaMovimentacao: pubs[pubs.length - 1].tipoComunicacao,
            ultimaSyncAt: now,
            fonteSync: ['djen'],
          })
          .returning({ id: processos.id });
        processoId = inserted.id;
        processosNovos++;
      }

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
        await db.insert(movimentacoes)
          .values(movValues.slice(i, i + BATCH))
          .onConflictDoNothing();
      }
    }

    return NextResponse.json({
      processosNovos,
      processosAtualizados,
      total: processosNovos + processosAtualizados,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/processos/import-djen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
