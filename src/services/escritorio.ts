/**
 * Service layer para o módulo de escritório/equipe do JurisRadar SaaS.
 *
 * Todas as funções recebem OrgContext e garantem isolamento multi-tenant
 * filtrando sempre por ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import { orgMembers, users, subscriptions, organizations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'

export interface ConviteMembro {
  email: string
  role: 'socio' | 'associado' | 'estagiario'
}

/**
 * Retorna a equipe da organização com dados dos usuários.
 */
export async function getEquipe(ctx: OrgContext) {
  const rows = await db
    .select({
      id: orgMembers.id,
      userId: orgMembers.userId,
      role: orgMembers.role,
      name: users.name,
      email: users.email,
      createdAt: null as Date | null,
    })
    .from(orgMembers)
    .leftJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, ctx.orgId))

  return rows.map((m) => ({
    ...m,
    isSelf: m.userId === ctx.userId,
  }))
}

/**
 * Retorna o plano atual da organização.
 */
export async function getPlanoAtual(ctx: OrgContext) {
  const rows = await db
    .select({
      status: subscriptions.status,
      plan: subscriptions.plan,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      trialEndsAt: subscriptions.trialEndsAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, ctx.orgId))
    .limit(1)

  return rows[0] ?? null
}

/**
 * Envia convite de membro para a organização.
 * Busca usuário por email — se não existir, cria um pendente com inviteToken.
 * Por ora, apenas valida e cria o membro se o usuário já existir.
 */
export async function convidarMembro(ctx: OrgContext, data: ConviteMembro) {
  if (!data.email || !data.email.includes('@')) {
    throw new ValidationError('Email inválido')
  }

  // Buscar usuário pelo email
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email.toLowerCase().trim()))
    .limit(1)

  if (!userRows.length) {
    // Usuário não existe no sistema — retorna info para convite por email
    return { invited: false, message: 'Usuário não encontrado. Convite por email será enviado.' }
  }

  const targetUserId = userRows[0].id

  // Verificar se já é membro
  const existing = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, ctx.orgId), eq(orgMembers.userId, targetUserId)))
    .limit(1)

  if (existing.length) {
    throw new ValidationError('Este usuário já é membro da organização')
  }

  const [created] = await db
    .insert(orgMembers)
    .values({
      orgId: ctx.orgId,
      userId: targetUserId,
      role: data.role,
    })
    .returning()

  return { invited: true, memberId: created.id }
}

/**
 * Remove um membro da organização.
 * Sócios não podem remover a si mesmos.
 */
export async function removerMembro(ctx: OrgContext, membroId: string) {
  const rows = await db
    .select({ id: orgMembers.id, orgId: orgMembers.orgId, userId: orgMembers.userId })
    .from(orgMembers)
    .where(eq(orgMembers.id, membroId))
    .limit(1)

  if (!rows.length) {
    throw new NotFoundError('Membro não encontrado')
  }

  const membro = rows[0]

  if (membro.orgId !== ctx.orgId) {
    throw new ForbiddenError('Acesso negado: membro pertence a outra organização')
  }

  if (membro.userId === ctx.userId) {
    throw new ForbiddenError('Você não pode remover a si mesmo')
  }

  await db.delete(orgMembers).where(eq(orgMembers.id, membroId))
}
