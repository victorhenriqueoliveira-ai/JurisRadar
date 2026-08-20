// ── Tipos de domínio central JurisRadar SaaS ─────────────────────────────────

/** Papéis de membros dentro de uma organização */
export type MemberRole = 'socio' | 'associado' | 'estagiario'

/** Status de assinatura da organização no Stripe */
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

/** Status de um processo judicial monitorado */
export type ProcessoStatus = 'ativo' | 'arquivado' | 'suspenso'

/** Contexto de organização resolvido a partir da sessão JWT */
export interface OrgContext {
  orgId: string
  userId: string
  role: MemberRole
}
