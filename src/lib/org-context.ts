/**
 * Helpers de contexto multi-tenant para o JurisRadar SaaS.
 *
 * ADR-002: Multi-tenancy com Row-Level Isolation via org_id.
 * `requireOrgContext()` é o ponto central de controle de acesso — todo
 * Route Handler e Server Action deve chamar este helper antes de acessar dados.
 */
import { auth } from '@/auth'
import type { OrgContext, MemberRole } from '@/types/domain'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export { UnauthorizedError, ForbiddenError }

/**
 * Resolve o contexto de organização a partir da sessão JWT.
 *
 * Lança `UnauthorizedError` se:
 * - Não há sessão ativa
 * - O JWT não contém `orgId` (usuário sem organização — deve ir para /onboarding)
 *
 * @returns OrgContext com `orgId`, `userId` e `role`
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new UnauthorizedError()
  }

  if (!session.user.orgId) {
    throw new UnauthorizedError('Organização não configurada. Complete o onboarding.')
  }

  return {
    orgId: session.user.orgId,
    userId: session.user.id,
    role: session.user.role as MemberRole,
  }
}

/**
 * Hierarquia de papéis (do menor para o maior privilégio).
 */
const ROLE_HIERARCHY: MemberRole[] = ['estagiario', 'associado', 'socio']

/**
 * Verifica se o contexto tem o papel mínimo exigido.
 *
 * Lança `ForbiddenError` se o papel do usuário for inferior ao mínimo.
 *
 * @param ctx - Contexto de organização resolvido
 * @param minimum - Papel mínimo exigido
 */
export function requireRole(ctx: OrgContext, minimum: MemberRole): void {
  const userIndex = ROLE_HIERARCHY.indexOf(ctx.role)
  const minimumIndex = ROLE_HIERARCHY.indexOf(minimum)

  if (userIndex < minimumIndex) {
    throw new ForbiddenError(
      `Papel insuficiente: requerido '${minimum}', usuário tem '${ctx.role}'`
    )
  }
}
