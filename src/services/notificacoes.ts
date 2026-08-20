/**
 * Service layer para notificações in-app do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.userId + ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import { notificacoes } from '@/db/schema'
import { eq, and, desc, gt, sql } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ForbiddenError, NotFoundError } from '@/lib/errors'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface NotificacaoFilters {
  lida?: boolean
  cursor?: string
  limit?: number
}

export type Notificacao = typeof notificacoes.$inferSelect

// ── Funções de service ─────────────────────────────────────────────────────────

/**
 * Conta notificações não lidas do usuário autenticado.
 * Endpoint leve para polling de 30s.
 */
export async function countNotificacoesNaoLidas(ctx: OrgContext): Promise<number> {
  const result = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(notificacoes)
    .where(
      and(
        eq(notificacoes.userId, ctx.userId),
        eq(notificacoes.orgId, ctx.orgId),
        eq(notificacoes.lida, false),
      ),
    )

  return result[0]?.count ?? 0
}

/**
 * Lista notificações do usuário com filtros opcionais e paginação por cursor.
 */
export async function listNotificacoes(
  ctx: OrgContext,
  filters: NotificacaoFilters = {},
) {
  const limit = Math.min(filters.limit ?? 20, 100)

  const conditions = [
    eq(notificacoes.userId, ctx.userId),
    eq(notificacoes.orgId, ctx.orgId),
  ]

  if (filters.lida !== undefined) {
    conditions.push(eq(notificacoes.lida, filters.lida))
  }

  if (filters.cursor) {
    conditions.push(gt(notificacoes.id, filters.cursor))
  }

  const rows = await db
    .select()
    .from(notificacoes)
    .where(and(...conditions))
    .orderBy(desc(notificacoes.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, nextCursor }
}

/**
 * Marca uma notificação individual como lida.
 * Lança ForbiddenError (403) se a notificação pertencer a outro usuário.
 */
export async function marcarLida(
  ctx: OrgContext,
  notificacaoId: string,
): Promise<void> {
  const rows = await db
    .select({ id: notificacoes.id, userId: notificacoes.userId, orgId: notificacoes.orgId })
    .from(notificacoes)
    .where(eq(notificacoes.id, notificacaoId))
    .limit(1)

  if (!rows.length) {
    throw new NotFoundError('Notificação não encontrada')
  }

  const notificacao = rows[0]

  // Isolamento por usuário — 403 (não 404) para notificação de outro usuário
  if (notificacao.userId !== ctx.userId) {
    throw new ForbiddenError('Acesso negado: notificação pertence a outro usuário')
  }

  if (notificacao.orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: notificação pertence a outro escritório')
  }

  await db
    .update(notificacoes)
    .set({ lida: true, lidaAt: new Date() })
    .where(
      and(
        eq(notificacoes.id, notificacaoId),
        eq(notificacoes.userId, ctx.userId),
        eq(notificacoes.orgId, ctx.orgId),
      ),
    )
}

/**
 * Marca todas as notificações não lidas do usuário autenticado como lidas.
 * Retorna o número de notificações atualizadas.
 */
export async function marcarTodasLidas(ctx: OrgContext): Promise<number> {
  const updated = await db
    .update(notificacoes)
    .set({ lida: true, lidaAt: new Date() })
    .where(
      and(
        eq(notificacoes.userId, ctx.userId),
        eq(notificacoes.orgId, ctx.orgId),
        eq(notificacoes.lida, false),
      ),
    )
    .returning({ id: notificacoes.id })

  return updated.length
}
