/**
 * Service layer para o módulo financeiro do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.orgId (ADR-002).
 *
 * Regras críticas:
 * - NUNCA hard delete em honorários — soft delete via arquivado_at (quando aplicável)
 * - status_pagamento SEMPRE recalculado após qualquer mutação de pagamento
 * - 403 para acesso a honorário de outro escritório (não 404)
 * - FORA DE ESCOPO: NFS-e, contabilidade, DRE
 */

import { db } from '@/db'
import { honorarios, pagamentos, processos } from '@/db/schema'
import { eq, and, sql, gte, lte } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type StatusPagamento = 'pendente' | 'parcial' | 'quitado'

export interface HonorarioFilters {
  status?: StatusPagamento
  inicio?: string // YYYY-MM
  fim?: string   // YYYY-MM
  cursor?: string
  limit?: number
}

export interface Periodo {
  inicio?: string // YYYY-MM
  fim?: string   // YYYY-MM
}

export interface HonorarioData {
  processoId: string
  tipo: string
  valor: number
  dataPrevista?: string
  descricao?: string
}

export interface PagamentoData {
  valor: number
  dataPagamento: string
  descricao?: string
}

// ── Funções puras ──────────────────────────────────────────────────────────────

/**
 * Calcula o status de pagamento com base no total pago vs valor do honorário.
 * - quitado: soma dos pagamentos >= valorTotal
 * - parcial: soma dos pagamentos > 0 mas < valorTotal
 * - pendente: nenhum pagamento registrado
 */
export function calcularStatusPagamento(
  valorTotal: number,
  pagamentosList: { valor: number | string }[],
): StatusPagamento {
  const totalPago = pagamentosList.reduce((acc, p) => acc + Number(p.valor), 0)
  if (totalPago <= 0) return 'pendente'
  if (totalPago >= valorTotal) return 'quitado'
  return 'parcial'
}

// ── Funções de service ─────────────────────────────────────────────────────────

/**
 * Retorna totais financeiros para o período solicitado.
 * - totalAReceber: honorários pendentes/parciais com data prevista no período
 * - totalRecebido: soma de pagamentos realizados no período
 * - emAtraso: honorários pendentes/parciais com data prevista anterior a hoje
 */
export async function getDashboardFinanceiro(
  ctx: OrgContext,
  periodo: Periodo = {},
) {
  const hoje = new Date().toISOString().split('T')[0]

  // Determinar datas de início e fim do período
  const inicioDate = periodo.inicio
    ? `${periodo.inicio}-01`
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const fimDate = periodo.fim
    ? `${periodo.fim}-31`
    : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

  // Total a receber: soma dos valores de honorários pendentes/parciais no período
  const aReceberRows = await db
    .select({ total: sql<string>`coalesce(sum(cast(${honorarios.valor} as numeric)), 0)` })
    .from(honorarios)
    .where(
      and(
        eq(honorarios.orgId, ctx.orgId),
        sql`${honorarios.statusPagamento} in ('pendente', 'parcial')`,
        gte(honorarios.dataPrevista, inicioDate),
        lte(honorarios.dataPrevista, fimDate),
      ),
    )

  // Total recebido: soma dos pagamentos realizados no período
  const recebidoRows = await db
    .select({ total: sql<string>`coalesce(sum(cast(${pagamentos.valor} as numeric)), 0)` })
    .from(pagamentos)
    .where(
      and(
        eq(pagamentos.orgId, ctx.orgId),
        gte(pagamentos.pagoEm, inicioDate),
        lte(pagamentos.pagoEm, fimDate),
      ),
    )

  // Em atraso: honorários pendentes/parciais com data prevista anterior a hoje
  const emAtrasoRows = await db
    .select({ total: sql<string>`coalesce(sum(cast(${honorarios.valor} as numeric)), 0)` })
    .from(honorarios)
    .where(
      and(
        eq(honorarios.orgId, ctx.orgId),
        sql`${honorarios.statusPagamento} in ('pendente', 'parcial')`,
        sql`${honorarios.dataPrevista} < ${hoje}`,
      ),
    )

  return {
    totalAReceber: Number(aReceberRows[0]?.total ?? 0),
    totalRecebido: Number(recebidoRows[0]?.total ?? 0),
    emAtraso: Number(emAtrasoRows[0]?.total ?? 0),
    periodo: { inicio: inicioDate, fim: fimDate },
  }
}

/**
 * Lista honorários da organização com filtros opcionais e paginação por cursor.
 */
export async function listHonorarios(
  ctx: OrgContext,
  filters: HonorarioFilters = {},
) {
  const limit = Math.min(filters.limit ?? 20, 100)

  const conditions = [eq(honorarios.orgId, ctx.orgId)]

  if (filters.status) {
    conditions.push(eq(honorarios.statusPagamento, filters.status))
  }

  if (filters.inicio) {
    conditions.push(gte(honorarios.dataPrevista, `${filters.inicio}-01`))
  }

  if (filters.fim) {
    conditions.push(lte(honorarios.dataPrevista, `${filters.fim}-31`))
  }

  if (filters.cursor) {
    conditions.push(sql`${honorarios.id} > ${filters.cursor}`)
  }

  const rows = await db
    .select()
    .from(honorarios)
    .where(and(...conditions))
    .orderBy(honorarios.dataPrevista)
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, nextCursor }
}

/**
 * Cria ou atualiza o honorário de um processo (um honorário por processo).
 * Se já existe um honorário para o processo, atualiza os campos.
 */
export async function createOrUpdateHonorario(
  ctx: OrgContext,
  data: HonorarioData,
) {
  if (!data.processoId) {
    throw new ValidationError('processoId é obrigatório')
  }
  if (typeof data.valor !== 'number' || data.valor < 0) {
    throw new ValidationError('valor deve ser um número não-negativo')
  }
  if (!data.tipo || data.tipo.trim().length === 0) {
    throw new ValidationError('tipo é obrigatório')
  }

  // Verificar que o processo existe e pertence ao org
  const processoRows = await db
    .select({ id: processos.id, orgId: processos.orgId })
    .from(processos)
    .where(eq(processos.id, data.processoId))
    .limit(1)

  if (!processoRows.length) {
    throw new NotFoundError('Processo não encontrado')
  }

  if (processoRows[0].orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: processo pertence a outro escritório')
  }

  // Verificar se já existe honorário para o processo
  const existingRows = await db
    .select()
    .from(honorarios)
    .where(eq(honorarios.processoId, data.processoId))
    .limit(1)

  if (existingRows.length > 0) {
    // Atualizar honorário existente
    const existing = existingRows[0]

    // Buscar pagamentos atuais para recalcular status
    const pgRows = await db
      .select({ valor: pagamentos.valor })
      .from(pagamentos)
      .where(eq(pagamentos.honorarioId, existing.id))

    const novoStatus = calcularStatusPagamento(data.valor, pgRows)

    const [updated] = await db
      .update(honorarios)
      .set({
        tipo: data.tipo.trim(),
        valor: String(data.valor),
        dataPrevista: data.dataPrevista ?? null,
        statusPagamento: novoStatus,
      })
      .where(and(eq(honorarios.id, existing.id), eq(honorarios.orgId, ctx.orgId)))
      .returning()

    return updated
  }

  // Criar novo honorário
  const [created] = await db
    .insert(honorarios)
    .values({
      orgId: ctx.orgId,
      processoId: data.processoId,
      tipo: data.tipo.trim(),
      valor: String(data.valor),
      dataPrevista: data.dataPrevista ?? null,
      statusPagamento: 'pendente',
    })
    .returning()

  return created
}

/**
 * Registra uma parcela paga em um honorário.
 * Após inserir, recalcula o status_pagamento automaticamente.
 */
export async function addPagamento(
  ctx: OrgContext,
  honorarioId: string,
  data: PagamentoData,
) {
  if (typeof data.valor !== 'number' || data.valor <= 0) {
    throw new ValidationError('valor do pagamento deve ser positivo')
  }
  if (!data.dataPagamento) {
    throw new ValidationError('dataPagamento é obrigatória')
  }

  // Verificar que o honorário existe e pertence ao org
  const honorarioRows = await db
    .select()
    .from(honorarios)
    .where(eq(honorarios.id, honorarioId))
    .limit(1)

  if (!honorarioRows.length) {
    throw new NotFoundError('Honorário não encontrado')
  }

  const honorario = honorarioRows[0]

  if (honorario.orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: honorário pertence a outro escritório')
  }

  // Inserir pagamento
  const [novoPagamento] = await db
    .insert(pagamentos)
    .values({
      orgId: ctx.orgId,
      honorarioId,
      valor: String(data.valor),
      pagoEm: data.dataPagamento,
      observacao: data.descricao ?? null,
    })
    .returning()

  // Recalcular status_pagamento
  await recalcularStatus(honorario)

  return novoPagamento
}

/**
 * Remove uma parcela de pagamento.
 * Verifica orgId (retorna 403 para outro escritório).
 * Após deletar, recalcula status_pagamento do honorário pai.
 */
export async function removePagamento(
  ctx: OrgContext,
  pagamentoId: string,
) {
  const pgRows = await db
    .select()
    .from(pagamentos)
    .where(eq(pagamentos.id, pagamentoId))
    .limit(1)

  if (!pgRows.length) {
    throw new NotFoundError('Pagamento não encontrado')
  }

  const pagamento = pgRows[0]

  if (pagamento.orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: pagamento pertence a outro escritório')
  }

  await db.delete(pagamentos).where(eq(pagamentos.id, pagamentoId))

  // Recalcular status do honorário pai
  const honorarioRows = await db
    .select()
    .from(honorarios)
    .where(eq(honorarios.id, pagamento.honorarioId))
    .limit(1)

  if (honorarioRows.length > 0) {
    await recalcularStatus(honorarioRows[0])
  }
}

// ── Helpers internos ───────────────────────────────────────────────────────────

async function recalcularStatus(honorario: typeof honorarios.$inferSelect) {
  const pgRows = await db
    .select({ valor: pagamentos.valor })
    .from(pagamentos)
    .where(eq(pagamentos.honorarioId, honorario.id))

  const novoStatus = calcularStatusPagamento(Number(honorario.valor ?? 0), pgRows)

  await db
    .update(honorarios)
    .set({ statusPagamento: novoStatus })
    .where(eq(honorarios.id, honorario.id))

  return novoStatus
}
