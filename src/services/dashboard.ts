/**
 * Service layer para o Dashboard Analítico do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por orgId (ADR-002).
 */

import { db } from '@/db'
import { processos, movimentacoes, notificacoes, eventosCalendario } from '@/db/schema'
import { eq, and, isNull, desc, sql, gte, lt, lte, count, inArray } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface DashboardData {
  totalAtivos: number
  urgenciaAlta: number
  prazos7Dias: number
  intimacoesNaoLidas: number
  distribuicaoStatus: { status: string; count: number }[]
  distribuicaoArea: { area: string; count: number }[]
  evolucaoMensal: { mes: string; novos: number; encerrados: number }[]
}

export interface PrazoUrgente {
  processoId: string
  numeroCnj: string
  tribunal: string | null
  prazoAt: string
  diasRestantes: number
}

export interface MovimentacaoRecente {
  processoId: string
  numeroCnj: string
  tipo: string | null
  descricao: string
  dataHora: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatMes(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ── Funções de service ─────────────────────────────────────────────────────────

/**
 * Agrega métricas do dashboard para o contexto de organização.
 * scope='escritorio' exige papel 'socio'; default 'pessoal' filtra por responsavel_id=userId.
 */
export async function aggregateDashboard(
  ctx: OrgContext,
  scope: 'pessoal' | 'escritorio' = 'pessoal',
): Promise<DashboardData> {
  const now = new Date()
  const em7Dias = addDays(now, 7)

  // Condição base de escopo
  const scopeCondition =
    scope === 'escritorio'
      ? eq(processos.orgId, ctx.orgId)
      : and(eq(processos.orgId, ctx.orgId), eq(processos.responsavelId, ctx.userId))

  // Condição para processos ativos (não arquivados)
  const ativos = and(scopeCondition, isNull(processos.arquivadoAt), eq(processos.status, 'ativo'))

  // 1. Total de processos ativos
  const [totalAtivosResult] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(processos)
    .where(ativos)

  // 2. Urgência alta — intimações/citações recebidas nas últimas 48h OU eventos futuros em ≤2 dias
  const em2Dias = addDays(now, 2)
  const ha2Dias = addDays(now, -2)

  const [urgentesEventos, urgentesMovs] = await Promise.all([
    db
      .selectDistinct({ processoId: eventosCalendario.processoId })
      .from(eventosCalendario)
      .innerJoin(processos, eq(eventosCalendario.processoId, processos.id))
      .where(
        and(
          eq(processos.orgId, ctx.orgId),
          isNull(processos.arquivadoAt),
          gte(eventosCalendario.data, now.toISOString().split('T')[0]),
          lte(eventosCalendario.data, em2Dias.toISOString().split('T')[0]),
          scope === 'pessoal' ? eq(processos.responsavelId, ctx.userId) : undefined,
        ),
      ),
    db
      .selectDistinct({ processoId: movimentacoes.processoId })
      .from(movimentacoes)
      .innerJoin(processos, eq(movimentacoes.processoId, processos.id))
      .where(
        and(
          eq(processos.orgId, ctx.orgId),
          isNull(processos.arquivadoAt),
          gte(movimentacoes.data, ha2Dias),
          inArray(movimentacoes.tipo, ['intimacao', 'citacao']),
          scope === 'pessoal' ? eq(processos.responsavelId, ctx.userId) : undefined,
        ),
      ),
  ])

  const urgentesSet = new Set([
    ...urgentesEventos.map((r) => r.processoId),
    ...urgentesMovs.map((r) => r.processoId),
  ])
  const urgenciaAlta = urgentesSet.size

  // 3. Prazos nos próximos 7 dias OU movimentações relevantes nos últimos 7 dias
  const ha7Dias = addDays(now, -7)

  const [prazosEventos, prazosMovs] = await Promise.all([
    db
      .selectDistinct({ processoId: eventosCalendario.processoId })
      .from(eventosCalendario)
      .innerJoin(processos, eq(eventosCalendario.processoId, processos.id))
      .where(
        and(
          eq(processos.orgId, ctx.orgId),
          isNull(processos.arquivadoAt),
          gte(eventosCalendario.data, now.toISOString().split('T')[0]),
          lte(eventosCalendario.data, em7Dias.toISOString().split('T')[0]),
          scope === 'pessoal' ? eq(processos.responsavelId, ctx.userId) : undefined,
        ),
      ),
    db
      .selectDistinct({ processoId: movimentacoes.processoId })
      .from(movimentacoes)
      .innerJoin(processos, eq(movimentacoes.processoId, processos.id))
      .where(
        and(
          eq(processos.orgId, ctx.orgId),
          isNull(processos.arquivadoAt),
          gte(movimentacoes.data, ha7Dias),
          inArray(movimentacoes.tipo, ['intimacao', 'citacao', 'publicacao_dje']),
          scope === 'pessoal' ? eq(processos.responsavelId, ctx.userId) : undefined,
        ),
      ),
  ])

  const prazosSet = new Set([
    ...prazosEventos.map((r) => r.processoId),
    ...prazosMovs.map((r) => r.processoId),
  ])
  const prazos7Dias = prazosSet.size

  // 4. Intimações não lidas (notificações não lidas do usuário na org)
  const intimacoesResult = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(notificacoes)
    .where(
      and(
        eq(notificacoes.orgId, ctx.orgId),
        eq(notificacoes.userId, ctx.userId),
        eq(notificacoes.lida, false),
      ),
    )

  const intimacoesNaoLidas = intimacoesResult[0]?.count ?? 0

  // 5. Distribuição por status
  const distribuicaoStatusRows = await db
    .select({
      status: processos.status,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(processos)
    .where(and(scopeCondition, isNull(processos.arquivadoAt)))
    .groupBy(processos.status)

  const distribuicaoStatus = distribuicaoStatusRows.map((r) => ({
    status: r.status,
    count: r.count,
  }))

  // 6. Distribuição por área do direito
  const distribuicaoAreaRows = await db
    .select({
      area: processos.areaDireito,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(processos)
    .where(and(scopeCondition, isNull(processos.arquivadoAt)))
    .groupBy(processos.areaDireito)

  const distribuicaoArea = distribuicaoAreaRows
    .filter((r) => r.area !== null)
    .map((r) => ({
      area: r.area as string,
      count: r.count,
    }))

  // 7. Evolução mensal — últimos 6 meses
  const evolucaoMensal: { mes: string; novos: number; encerrados: number }[] = []
  const meses: string[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    meses.push(formatMes(d))
  }

  for (const mes of meses) {
    const [ano, mesNum] = mes.split('-').map(Number)
    const inicio = new Date(ano, mesNum - 1, 1)
    const fim = new Date(ano, mesNum, 1)

    const novosResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(processos)
      .where(
        and(
          scopeCondition,
          gte(processos.createdAt, inicio),
          lt(processos.createdAt, fim),
        ),
      )

    const encerradosResult = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(processos)
      .where(
        and(
          scopeCondition,
          gte(processos.arquivadoAt, inicio),
          lt(processos.arquivadoAt, fim),
        ),
      )

    evolucaoMensal.push({
      mes,
      novos: novosResult[0]?.count ?? 0,
      encerrados: encerradosResult[0]?.count ?? 0,
    })
  }

  return {
    totalAtivos: totalAtivosResult?.count ?? 0,
    urgenciaAlta,
    prazos7Dias,
    intimacoesNaoLidas,
    distribuicaoStatus,
    distribuicaoArea,
    evolucaoMensal,
  }
}

/**
 * Retorna até 5 prazos mais críticos (mais próximos) da organização.
 */
export async function getPrazosUrgentes(ctx: OrgContext): Promise<PrazoUrgente[]> {
  const hoje = new Date().toISOString().split('T')[0]
  const ha30Dias = addDays(new Date(), -30)
  const now = new Date()

  // Eventos futuros do calendário
  const eventoRows = await db
    .select({
      processoId: eventosCalendario.processoId,
      numeroCnj: processos.numeroCnj,
      tribunal: processos.tribunal,
      prazoAt: eventosCalendario.data,
    })
    .from(eventosCalendario)
    .innerJoin(processos, eq(eventosCalendario.processoId, processos.id))
    .where(
      and(
        eq(processos.orgId, ctx.orgId),
        isNull(processos.arquivadoAt),
        gte(eventosCalendario.data, hoje),
      ),
    )
    .orderBy(eventosCalendario.data)
    .limit(5)

  // Movimentações relevantes dos últimos 30 dias (intimações/citações sem evento futuro)
  const movRows = await db
    .select({
      processoId: movimentacoes.processoId,
      numeroCnj: processos.numeroCnj,
      tribunal: processos.tribunal,
      prazoAt: sql<string>`to_char(${movimentacoes.data}, 'YYYY-MM-DD')`,
    })
    .from(movimentacoes)
    .innerJoin(processos, eq(movimentacoes.processoId, processos.id))
    .where(
      and(
        eq(processos.orgId, ctx.orgId),
        isNull(processos.arquivadoAt),
        gte(movimentacoes.data, ha30Dias),
        inArray(movimentacoes.tipo, ['intimacao', 'citacao']),
      ),
    )
    .orderBy(desc(movimentacoes.data))
    .limit(10)

  const eventoProcessoIds = new Set(eventoRows.map((r) => r.processoId))

  const eventosPrazos: PrazoUrgente[] = eventoRows.map((row) => {
    const prazo = new Date(row.prazoAt)
    const diffMs = prazo.getTime() - now.getTime()
    return {
      processoId: row.processoId,
      numeroCnj: row.numeroCnj,
      tribunal: row.tribunal,
      prazoAt: row.prazoAt,
      diasRestantes: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
    }
  })

  // Movimentações de processos que não têm evento futuro (para completar até 5 itens)
  const movPrazos: PrazoUrgente[] = movRows
    .filter((r) => !eventoProcessoIds.has(r.processoId))
    .map((row) => {
      const prazo = new Date(row.prazoAt + 'T00:00:00')
      const diffMs = prazo.getTime() - now.getTime()
      return {
        processoId: row.processoId,
        numeroCnj: row.numeroCnj,
        tribunal: row.tribunal,
        prazoAt: row.prazoAt,
        diasRestantes: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
      }
    })

  // Deduplica por processoId, prioriza eventos futuros
  const vistos = new Set<string>()
  return [...eventosPrazos, ...movPrazos]
    .filter((r) => {
      if (vistos.has(r.processoId)) return false
      vistos.add(r.processoId)
      return true
    })
    .slice(0, 5)
}

/**
 * Retorna as últimas 10 movimentações da organização.
 */
export async function getMovimentacoesRecentes(ctx: OrgContext): Promise<MovimentacaoRecente[]> {
  const rows = await db
    .select({
      processoId: movimentacoes.processoId,
      numeroCnj: processos.numeroCnj,
      tipo: movimentacoes.tipo,
      descricao: movimentacoes.descricao,
      dataHora: movimentacoes.data,
    })
    .from(movimentacoes)
    .innerJoin(processos, eq(movimentacoes.processoId, processos.id))
    .where(
      and(
        eq(movimentacoes.orgId, ctx.orgId),
        isNull(processos.arquivadoAt),
      ),
    )
    .orderBy(desc(movimentacoes.data))
    .limit(10)

  return rows.map((row) => ({
    processoId: row.processoId,
    numeroCnj: row.numeroCnj,
    tipo: row.tipo,
    descricao: row.descricao,
    dataHora: row.dataHora.toISOString(),
  }))
}
