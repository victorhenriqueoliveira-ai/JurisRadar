/**
 * Service layer para o módulo de tarefas do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import { tarefas } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'

export interface TarefaFilters {
  status?: string
  prioridade?: string
}

export interface TarefaData {
  titulo: string
  processoRef?: string
  prioridade?: string
  prazo?: string
  status?: string
}

/**
 * Lista tarefas da organização com filtros opcionais.
 */
export async function listTarefas(ctx: OrgContext, filters: TarefaFilters = {}) {
  const conditions = [eq(tarefas.orgId, ctx.orgId)]

  if (filters.status) {
    conditions.push(eq(tarefas.status, filters.status))
  }

  if (filters.prioridade) {
    conditions.push(eq(tarefas.prioridade, filters.prioridade))
  }

  return db
    .select()
    .from(tarefas)
    .where(and(...conditions))
    .orderBy(desc(tarefas.createdAt))
}

/**
 * Cria uma nova tarefa para a organização.
 */
export async function createTarefa(ctx: OrgContext, data: TarefaData) {
  if (!data.titulo || data.titulo.trim().length === 0) {
    throw new ValidationError('titulo é obrigatório')
  }

  const [created] = await db
    .insert(tarefas)
    .values({
      orgId: ctx.orgId,
      titulo: data.titulo.trim(),
      processoRef: data.processoRef ?? null,
      prioridade: data.prioridade ?? 'media',
      prazo: data.prazo ?? null,
      status: data.status ?? 'pendente',
      criadoPorId: ctx.userId,
    })
    .returning()

  return created
}

/**
 * Atualiza o status de uma tarefa.
 * Verifica que a tarefa pertence ao org antes de atualizar.
 */
export async function updateTarefaStatus(ctx: OrgContext, id: string, status: string) {
  const rows = await db
    .select({ id: tarefas.id, orgId: tarefas.orgId })
    .from(tarefas)
    .where(eq(tarefas.id, id))
    .limit(1)

  if (!rows.length) {
    throw new NotFoundError('Tarefa não encontrada')
  }

  if (rows[0].orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: tarefa pertence a outro escritório')
  }

  const [updated] = await db
    .update(tarefas)
    .set({ status })
    .where(and(eq(tarefas.id, id), eq(tarefas.orgId, ctx.orgId)))
    .returning()

  return updated
}
