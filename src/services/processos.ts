/**
 * Service layer para CRM de processos do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import {
  processos,
  movimentacoes,
  honorarios,
  notasProcesso,
} from '@/db/schema'
import { eq, and, isNull, desc, gt, ilike, or, sql } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import { requireRole } from '@/lib/org-context'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ProcessoFilters {
  status?: string
  area?: string
  tribunal?: string
  responsavel_id?: string
  urgencia?: string
  q?: string
  cursor?: string
  limit?: number
}

export type ProcessoComMovimentacoes = typeof processos.$inferSelect & {
  movimentacoes: (typeof movimentacoes.$inferSelect)[]
  honorario: (typeof honorarios.$inferSelect) | null
  notas: (typeof notasProcesso.$inferSelect)[]
}

// ── Funções de service ─────────────────────────────────────────────────────────

/**
 * Lista processos de uma organização com filtros opcionais e paginação por cursor.
 * Exclui automaticamente processos arquivados (arquivado_at IS NULL).
 */
export async function listProcessos(
  ctx: OrgContext,
  filters: ProcessoFilters = {},
) {
  const limit = Math.min(filters.limit ?? 20, 100)

  const conditions = [
    eq(processos.orgId, ctx.orgId),
    isNull(processos.arquivadoAt),
  ]

  if (filters.status) {
    conditions.push(eq(processos.status, filters.status))
  }

  if (filters.area) {
    conditions.push(eq(processos.areaDireito, filters.area))
  }

  if (filters.tribunal) {
    conditions.push(eq(processos.tribunal, filters.tribunal))
  }

  if (filters.responsavel_id) {
    conditions.push(eq(processos.responsavelId, filters.responsavel_id))
  }

  if (filters.q) {
    conditions.push(
      or(
        ilike(processos.numeroCnj, `%${filters.q}%`),
        ilike(processos.ultimaMovimentacao, `%${filters.q}%`),
      )!,
    )
  }

  if (filters.cursor) {
    conditions.push(gt(processos.id, filters.cursor))
  }

  const rows = await db
    .select()
    .from(processos)
    .where(and(...conditions))
    .orderBy(desc(processos.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? data[data.length - 1].id : null

  // Total count (sem cursor para refletir o total real com os filtros aplicados)
  const countConditions = [
    eq(processos.orgId, ctx.orgId),
    isNull(processos.arquivadoAt),
  ]

  if (filters.status) countConditions.push(eq(processos.status, filters.status))
  if (filters.area) countConditions.push(eq(processos.areaDireito, filters.area))
  if (filters.tribunal) countConditions.push(eq(processos.tribunal, filters.tribunal))
  if (filters.responsavel_id) countConditions.push(eq(processos.responsavelId, filters.responsavel_id))
  if (filters.q) {
    countConditions.push(
      or(
        ilike(processos.numeroCnj, `%${filters.q}%`),
        ilike(processos.ultimaMovimentacao, `%${filters.q}%`),
      )!,
    )
  }

  const totalResult = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(processos)
    .where(and(...countConditions))

  return {
    data,
    nextCursor,
    total: totalResult[0]?.count ?? 0,
  }
}

/**
 * Retorna um processo com suas últimas 50 movimentações, honorário e notas.
 * Verifica que o processo pertence ao org do contexto — retorna null se não encontrado.
 * Lança ForbiddenError se o processo pertencer a outro org.
 */
export async function getProcesso(
  ctx: OrgContext,
  processoId: string,
): Promise<ProcessoComMovimentacoes | null> {
  const processoRows = await db
    .select()
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1)

  if (!processoRows.length) {
    return null
  }

  const processo = processoRows[0]

  // Isolamento multi-tenant: retornar 403 (não 404) para processo de outro escritório
  if (processo.orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: processo pertence a outro escritório')
  }

  const [movs, honorario, notas] = await Promise.all([
    db
      .select()
      .from(movimentacoes)
      .where(eq(movimentacoes.processoId, processoId))
      .orderBy(desc(movimentacoes.data))
      .limit(50),
    db
      .select()
      .from(honorarios)
      .where(eq(honorarios.processoId, processoId))
      .limit(1),
    db
      .select()
      .from(notasProcesso)
      .where(eq(notasProcesso.processoId, processoId))
      .orderBy(desc(notasProcesso.createdAt)),
  ])

  return {
    ...processo,
    movimentacoes: movs,
    honorario: honorario[0] ?? null,
    notas,
  }
}

/**
 * Realiza soft delete de um processo (seta arquivado_at, não deleta o registro).
 * Requer papel mínimo: associado.
 */
export async function archiveProcesso(
  ctx: OrgContext,
  processoId: string,
): Promise<void> {
  requireRole(ctx, 'associado')

  const processoRows = await db
    .select({ id: processos.id, orgId: processos.orgId })
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1)

  if (!processoRows.length) {
    throw new NotFoundError('Processo não encontrado')
  }

  if (processoRows[0].orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: processo pertence a outro escritório')
  }

  await db
    .update(processos)
    .set({ arquivadoAt: new Date() })
    .where(and(eq(processos.id, processoId), eq(processos.orgId, ctx.orgId)))
}

/**
 * Atualiza campos de um processo (responsavel_id, status).
 * Requer papel mínimo: associado.
 */
export async function updateProcesso(
  ctx: OrgContext,
  processoId: string,
  data: Partial<Pick<typeof processos.$inferSelect, 'responsavelId' | 'status'>>,
): Promise<void> {
  requireRole(ctx, 'associado')

  const processoRows = await db
    .select({ id: processos.id, orgId: processos.orgId })
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1)

  if (!processoRows.length) {
    throw new NotFoundError('Processo não encontrado')
  }

  if (processoRows[0].orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: processo pertence a outro escritório')
  }

  await db
    .update(processos)
    .set(data)
    .where(and(eq(processos.id, processoId), eq(processos.orgId, ctx.orgId)))
}

/**
 * Adiciona uma nota interna a um processo.
 * Requer papel mínimo: associado.
 */
export async function addNota(
  ctx: OrgContext,
  processoId: string,
  conteudo: string,
): Promise<typeof notasProcesso.$inferSelect> {
  requireRole(ctx, 'associado')

  if (!conteudo || conteudo.trim().length === 0) {
    throw new ValidationError('Conteúdo da nota não pode ser vazio')
  }

  // Verificar que o processo existe e pertence ao org
  const processoRows = await db
    .select({ id: processos.id, orgId: processos.orgId })
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1)

  if (!processoRows.length) {
    throw new NotFoundError('Processo não encontrado')
  }

  if (processoRows[0].orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: processo pertence a outro escritório')
  }

  const [nota] = await db
    .insert(notasProcesso)
    .values({
      orgId: ctx.orgId,
      processoId,
      userId: ctx.userId,
      conteudo: conteudo.trim(),
    })
    .returning()

  return nota
}

/**
 * Remove uma nota interna.
 * Apenas o autor da nota OU sócio pode deletar.
 */
export async function deleteNota(
  ctx: OrgContext,
  notaId: string,
): Promise<void> {
  const notaRows = await db
    .select()
    .from(notasProcesso)
    .where(eq(notasProcesso.id, notaId))
    .limit(1)

  if (!notaRows.length) {
    throw new NotFoundError('Nota não encontrada')
  }

  const nota = notaRows[0]

  if (nota.orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: nota pertence a outro escritório')
  }

  // Apenas o autor ou um sócio pode deletar
  const isAuthor = nota.userId === ctx.userId
  const isSocio = ctx.role === 'socio'

  if (!isAuthor && !isSocio) {
    throw new ForbiddenError('Apenas o autor da nota ou um sócio pode removê-la')
  }

  await db.delete(notasProcesso).where(eq(notasProcesso.id, notaId))
}
