/**
 * Service layer para o módulo Kanban do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import { kanbanCards } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'

export type ColId = 'a_fazer' | 'em_andamento' | 'aguardando' | 'concluido'

export interface KanbanCardData {
  titulo: string
  coluna?: ColId
  prioridade?: string
  tag?: string
  prazo?: string
}

/**
 * Retorna todos os cards agrupados por coluna.
 */
export async function listKanbanCards(ctx: OrgContext) {
  const rows = await db
    .select()
    .from(kanbanCards)
    .where(eq(kanbanCards.orgId, ctx.orgId))
    .orderBy(asc(kanbanCards.ordem), asc(kanbanCards.createdAt))

  const grouped: Record<ColId, typeof rows> = {
    a_fazer: [],
    em_andamento: [],
    aguardando: [],
    concluido: [],
  }

  for (const card of rows) {
    const col = card.coluna as ColId
    if (col in grouped) {
      grouped[col].push(card)
    }
  }

  return grouped
}

/**
 * Cria um novo card no Kanban.
 */
export async function createKanbanCard(ctx: OrgContext, data: KanbanCardData) {
  if (!data.titulo || data.titulo.trim().length === 0) {
    throw new ValidationError('titulo é obrigatório')
  }

  const [created] = await db
    .insert(kanbanCards)
    .values({
      orgId: ctx.orgId,
      titulo: data.titulo.trim(),
      coluna: data.coluna ?? 'a_fazer',
      prioridade: data.prioridade ?? 'media',
      tag: data.tag ?? null,
      prazo: data.prazo ?? null,
      ordem: 0,
    })
    .returning()

  return created
}

/**
 * Move um card para outra coluna.
 * Verifica que o card pertence ao org antes de mover.
 */
export async function moveKanbanCard(ctx: OrgContext, id: string, coluna: ColId) {
  const rows = await db
    .select({ id: kanbanCards.id, orgId: kanbanCards.orgId })
    .from(kanbanCards)
    .where(eq(kanbanCards.id, id))
    .limit(1)

  if (!rows.length) {
    throw new NotFoundError('Card não encontrado')
  }

  if (rows[0].orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: card pertence a outro escritório')
  }

  const [updated] = await db
    .update(kanbanCards)
    .set({ coluna })
    .where(and(eq(kanbanCards.id, id), eq(kanbanCards.orgId, ctx.orgId)))
    .returning()

  return updated
}
