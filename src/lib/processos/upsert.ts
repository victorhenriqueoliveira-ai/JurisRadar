/**
 * Upsert de processos e insert idempotente de movimentações.
 *
 * - `upsertProcesso`: insere ou atualiza um processo por (numero_cnj, org_id).
 *   Atualiza `ultima_movimentacao` e `ultima_sync_at` em conflito.
 * - `insertMovimentacoesIdempotente`: insere movimentações com ON CONFLICT DO NOTHING
 *   na constraint (processo_id, externo_id), evitando duplicatas.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { processos, movimentacoes } from '@/db/schema';
import type { ProcessoResult } from '@/lib/datajud/types';

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

export interface UpsertProcessoInput {
  orgId: string;
  processo: ProcessoResult;
  /** Fonte da sincronização, ex: ['datajud'] */
  fonteSync?: string[];
}

export interface UpsertProcessoResult {
  processoId: string;
  isNew: boolean;
}

export interface InsertMovimentacaoInput {
  processoId: string;
  orgId: string;
  data: string;        // ISO 8601
  descricao: string;
  tipo?: string;
  fonte?: string;
  externoId?: string;
}

// ── Upsert de processo ────────────────────────────────────────────────────────

/**
 * Insere ou atualiza um processo pelo número CNJ dentro de uma organização.
 *
 * Em conflito (mesmo numero_cnj + org_id): atualiza ultima_movimentacao,
 * ultima_sync_at e adiciona a fonte ao array fonteSync.
 *
 * Retorna o id do processo e se foi inserção nova.
 */
export async function upsertProcesso(
  input: UpsertProcessoInput,
): Promise<UpsertProcessoResult> {
  const { orgId, processo, fonteSync = ['datajud'] } = input;

  const ultimaMovimentacaoDescricao = processo.ultimaMovimentacao?.descricao ?? null;
  const now = new Date();

  // Verifica se o processo já existe
  const existing = await db
    .select({ id: processos.id })
    .from(processos)
    .where(
      and(
        eq(processos.numeroCnj, processo.numero),
        eq(processos.orgId, orgId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    // Atualiza o registro existente
    await db
      .update(processos)
      .set({
        tribunal: processo.tribunal || undefined,
        ultimaMovimentacao: ultimaMovimentacaoDescricao,
        ultimaSyncAt: now,
        fonteSync,
      })
      .where(
        and(
          eq(processos.numeroCnj, processo.numero),
          eq(processos.orgId, orgId),
        ),
      );

    return { processoId: existing[0].id, isNew: false };
  }

  // Insere novo processo
  const inserted = await db
    .insert(processos)
    .values({
      orgId,
      numeroCnj: processo.numero,
      tribunal: processo.tribunal || null,
      areaDireito: processo.assunto ?? null,
      status: 'ativo',
      ultimaMovimentacao: ultimaMovimentacaoDescricao,
      ultimaSyncAt: now,
      fonteSync,
    })
    .returning({ id: processos.id });

  return { processoId: inserted[0].id, isNew: true };
}

// ── Insert idempotente de movimentações ───────────────────────────────────────

/**
 * Insere movimentações com ON CONFLICT DO NOTHING para evitar duplicatas.
 * A unicidade é garantida pela constraint (processo_id, externo_id).
 *
 * Movimentações sem externo_id são inseridas normalmente (sem proteção de conflito).
 */
export async function insertMovimentacoesIdempotente(
  inputs: InsertMovimentacaoInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;

  const values = inputs.map((m) => ({
    orgId: m.orgId,
    processoId: m.processoId,
    data: new Date(m.data),
    descricao: m.descricao,
    tipo: m.tipo ?? null,
    fonte: m.fonte ?? null,
    externoId: m.externoId ?? null,
  }));

  // Insere em lotes para evitar queries muito grandes
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    const result = await db
      .insert(movimentacoes)
      .values(batch)
      .onConflictDoNothing()
      .returning({ id: movimentacoes.id });

    inserted += result.length;
  }

  return inserted;
}

// ── Atualizar ultima_sync_at ──────────────────────────────────────────────────

/**
 * Atualiza `ultima_sync_at` de um processo pelo id.
 */
export async function atualizarUltimaSyncAt(processoId: string): Promise<void> {
  await db
    .update(processos)
    .set({ ultimaSyncAt: new Date() })
    .where(eq(processos.id, processoId));
}
