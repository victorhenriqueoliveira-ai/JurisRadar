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
  users,
} from '@/db/schema'
import { eq, and, isNull, desc, asc, gt, ilike, or, sql, SQL } from 'drizzle-orm'
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
  sort?: string
  order?: 'asc' | 'desc'
}

export type ProcessoComMovimentacoes = typeof processos.$inferSelect & {
  movimentacoes: (typeof movimentacoes.$inferSelect)[]
  honorario: (typeof honorarios.$inferSelect) | null
  notas: (typeof notasProcesso.$inferSelect)[]
}

// ── Próximo prazo ──────────────────────────────────────────────────────────────

/**
 * Subquery: data do próximo compromisso futuro de cada processo — menor data
 * entre eventos de calendário explícitos (eventos_calendario) e movimentações
 * processuais do tipo prazo/audiência (mesma fonte usada no Calendário, em
 * services/calendario.ts, para manter as duas telas consistentes).
 */
const PROXIMO_PRAZO_SQ = sql`(
  select processo_id, min(data) as proximo_prazo
  from (
    select processo_id, data
    from eventos_calendario
    where data >= current_date
    union all
    select processo_id, (data at time zone 'UTC')::date as data
    from movimentacoes
    where tipo in ('audiencia', 'prazo', 'prazo_fatal', 'sessao', 'julgamento')
      and (data at time zone 'UTC')::date >= current_date
  ) eventos
  group by processo_id
)`

const UF_SORT_COLUMNS: Record<string, SQL | ReturnType<typeof sql<string>>> = {
  numeroCnj: sql`${processos.numeroCnj}`,
  tribunal: sql`${processos.tribunal}`,
  areaDireito: sql`${processos.areaDireito}`,
  status: sql`${processos.status}`,
  ultimaMovimentacao: sql`${processos.ultimaMovimentacao}`,
  proximoPrazo: sql`pp.proximo_prazo`,
  responsavelNome: sql`${users.name}`,
  createdAt: sql`${processos.createdAt}`,
}

// ── Funções de service ─────────────────────────────────────────────────────────

function buildConditions(ctx: OrgContext, filters: ProcessoFilters) {
  const conditions = [
    eq(processos.orgId, ctx.orgId),
    isNull(processos.arquivadoAt),
  ]

  if (filters.status) conditions.push(eq(processos.status, filters.status))
  if (filters.area) conditions.push(eq(processos.areaDireito, filters.area))
  if (filters.tribunal) conditions.push(eq(processos.tribunal, filters.tribunal))
  if (filters.responsavel_id) conditions.push(eq(processos.responsavelId, filters.responsavel_id))

  if (filters.q) {
    conditions.push(
      or(
        ilike(processos.numeroCnj, `%${filters.q}%`),
        ilike(processos.ultimaMovimentacao, `%${filters.q}%`),
      )!,
    )
  }

  if (filters.urgencia) {
    // "Urgente" = próximo prazo existe e cai dentro de 5 dias — mesmo limiar
    // usado no destaque visual da tabela (isUrgent, ProcessoTable.tsx).
    conditions.push(sql`pp.proximo_prazo is not null and pp.proximo_prazo <= current_date + 5`)
  }

  return conditions
}

/**
 * Lista processos de uma organização com filtros opcionais e paginação por cursor.
 * Exclui automaticamente processos arquivados (arquivado_at IS NULL).
 */
export async function listProcessos(
  ctx: OrgContext,
  filters: ProcessoFilters = {},
) {
  const limit = Math.min(filters.limit ?? 20, 100)

  const conditions = buildConditions(ctx, filters)
  if (filters.cursor) conditions.push(gt(processos.id, filters.cursor))

  const sortColumn = (filters.sort && UF_SORT_COLUMNS[filters.sort]) || processos.createdAt
  const sortDirection = filters.order === 'asc' ? asc : desc

  const rows = await db
    .select({
      id: processos.id,
      orgId: processos.orgId,
      numeroCnj: processos.numeroCnj,
      tribunal: processos.tribunal,
      areaDireito: processos.areaDireito,
      status: processos.status,
      responsavelId: processos.responsavelId,
      ultimaMovimentacao: processos.ultimaMovimentacao,
      ultimaSyncAt: processos.ultimaSyncAt,
      fonteSync: processos.fonteSync,
      arquivadoAt: processos.arquivadoAt,
      createdAt: processos.createdAt,
      proximoPrazo: sql<string | null>`pp.proximo_prazo`,
      responsavelNome: users.name,
    })
    .from(processos)
    .leftJoin(sql`${PROXIMO_PRAZO_SQ} pp`, sql`pp.processo_id = ${processos.id}`)
    .leftJoin(users, eq(users.id, processos.responsavelId))
    .where(and(...conditions))
    .orderBy(sortDirection(sortColumn), desc(processos.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? data[data.length - 1].id : null

  // Total count (sem cursor para refletir o total real com os filtros aplicados)
  const countConditions = buildConditions(ctx, filters)

  const totalResult = await db
    .select({ count: sql<number>`cast(count(distinct ${processos.id}) as int)` })
    .from(processos)
    .leftJoin(sql`${PROXIMO_PRAZO_SQ} pp`, sql`pp.processo_id = ${processos.id}`)
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
