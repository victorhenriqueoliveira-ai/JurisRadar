/**
 * Service layer para o módulo de clientes do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import { clientes } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ValidationError } from '@/lib/errors'

export interface ClienteData {
  nome: string
  email?: string
  whatsapp?: string
  cpfCnpj?: string
}

/**
 * Lista todos os clientes da organização.
 */
export async function listClientes(ctx: OrgContext) {
  return db
    .select()
    .from(clientes)
    .where(eq(clientes.orgId, ctx.orgId))
    .orderBy(desc(clientes.createdAt))
}

/**
 * Cria um novo cliente para a organização.
 */
export async function createCliente(ctx: OrgContext, data: ClienteData) {
  if (!data.nome || data.nome.trim().length === 0) {
    throw new ValidationError('nome é obrigatório')
  }

  const [created] = await db
    .insert(clientes)
    .values({
      orgId: ctx.orgId,
      nome: data.nome.trim(),
      email: data.email ?? null,
      whatsapp: data.whatsapp ?? null,
      cpfCnpj: data.cpfCnpj ?? null,
    })
    .returning()

  return created
}
