/**
 * Service layer para o perfil do usuário no JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.userId (ADR-002).
 */

import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { NotFoundError, ValidationError } from '@/lib/errors'

export interface PerfilData {
  name?: string
  email?: string
  oabNumero?: string
  oabEstado?: string
}

/**
 * Retorna os dados de perfil do usuário autenticado.
 */
export async function getPerfilUsuario(ctx: OrgContext) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      oabNumero: users.oabNumero,
      oabEstado: users.oabEstado,
      whatsappNumero: users.whatsappNumero,
      cpf: users.cpf,
    })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1)

  if (!rows.length) {
    throw new NotFoundError('Usuário não encontrado')
  }

  return rows[0]
}

/**
 * Atualiza os dados de perfil do usuário autenticado.
 */
export async function updatePerfilUsuario(ctx: OrgContext, data: PerfilData) {
  if (data.name !== undefined && data.name.trim().length === 0) {
    throw new ValidationError('Nome não pode ser vazio')
  }

  const updateFields: Partial<typeof users.$inferInsert> = {}

  if (data.name !== undefined) updateFields.name = data.name.trim()
  if (data.oabNumero !== undefined) updateFields.oabNumero = data.oabNumero
  if (data.oabEstado !== undefined) updateFields.oabEstado = data.oabEstado

  if (Object.keys(updateFields).length === 0) {
    return getPerfilUsuario(ctx)
  }

  const [updated] = await db
    .update(users)
    .set(updateFields)
    .where(eq(users.id, ctx.userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      oabNumero: users.oabNumero,
      oabEstado: users.oabEstado,
      whatsappNumero: users.whatsappNumero,
      cpf: users.cpf,
    })

  return updated
}
