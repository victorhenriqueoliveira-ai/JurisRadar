/**
 * Service layer para o módulo de consultorias do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import { consultorias, clientes } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ValidationError } from '@/lib/errors'

export interface ConsultoriaData {
  titulo: string
  clienteId?: string
  valorEstimado?: number
  data?: string
  status?: string
}

/**
 * Lista consultorias da organização com join de cliente (nome).
 */
export async function listConsultorias(ctx: OrgContext) {
  const rows = await db
    .select({
      id: consultorias.id,
      titulo: consultorias.titulo,
      clienteId: consultorias.clienteId,
      clienteNome: clientes.nome,
      valorEstimado: consultorias.valorEstimado,
      data: consultorias.data,
      status: consultorias.status,
      createdAt: consultorias.createdAt,
    })
    .from(consultorias)
    .leftJoin(clientes, eq(consultorias.clienteId, clientes.id))
    .where(eq(consultorias.orgId, ctx.orgId))
    .orderBy(desc(consultorias.createdAt))

  return rows
}

/**
 * Cria uma nova consultoria para a organização.
 */
export async function createConsultoria(ctx: OrgContext, data: ConsultoriaData) {
  if (!data.titulo || data.titulo.trim().length === 0) {
    throw new ValidationError('titulo é obrigatório')
  }

  const [created] = await db
    .insert(consultorias)
    .values({
      orgId: ctx.orgId,
      titulo: data.titulo.trim(),
      clienteId: data.clienteId ?? null,
      valorEstimado: data.valorEstimado != null ? String(data.valorEstimado) : null,
      data: data.data ?? null,
      status: data.status ?? 'pendente',
    })
    .returning()

  return created
}
