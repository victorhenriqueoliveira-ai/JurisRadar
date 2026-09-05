/**
 * Service layer para o módulo de casos do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import { casos, clientes, users } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ValidationError } from '@/lib/errors'

export interface CasoData {
  titulo: string
  clienteId?: string
  responsavelId?: string
  status?: string
}

/**
 * Lista casos da organização com join de cliente e responsável.
 */
export async function listCasos(ctx: OrgContext) {
  const responsavel = {
    id: users.id,
    name: users.name,
  }

  const rows = await db
    .select({
      id: casos.id,
      titulo: casos.titulo,
      clienteId: casos.clienteId,
      clienteNome: clientes.nome,
      responsavelId: casos.responsavelId,
      responsavelNome: users.name,
      status: casos.status,
      createdAt: casos.createdAt,
    })
    .from(casos)
    .leftJoin(clientes, eq(casos.clienteId, clientes.id))
    .leftJoin(users, eq(casos.responsavelId, users.id))
    .where(eq(casos.orgId, ctx.orgId))
    .orderBy(desc(casos.createdAt))

  return rows
}

/**
 * Cria um novo caso para a organização.
 */
export async function createCaso(ctx: OrgContext, data: CasoData) {
  if (!data.titulo || data.titulo.trim().length === 0) {
    throw new ValidationError('titulo é obrigatório')
  }

  const [created] = await db
    .insert(casos)
    .values({
      orgId: ctx.orgId,
      titulo: data.titulo.trim(),
      clienteId: data.clienteId ?? null,
      responsavelId: data.responsavelId ?? null,
      status: data.status ?? 'ativo',
    })
    .returning()

  return created
}
