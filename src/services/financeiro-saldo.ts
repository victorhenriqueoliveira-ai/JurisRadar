/**
 * Service layer para saldo e repasses financeiros do JurisRadar SaaS.
 *
 * Agrega honorários e pagamentos para calcular saldo disponível.
 * Filtra sempre por ctx.orgId (ADR-002).
 */

import { db } from '@/db'
import { honorarios, pagamentos } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'

/**
 * Retorna saldo agregado de repasses para a organização.
 * - totalRecebido: soma de todos os pagamentos da org
 * - totalPendente: soma de honorários pendentes/parciais
 */
export async function getSaldoRepasses(ctx: OrgContext) {
  const [recebidoRow] = await db
    .select({
      total: sql<string>`coalesce(sum(cast(${pagamentos.valor} as numeric)), 0)`,
    })
    .from(pagamentos)
    .where(eq(pagamentos.orgId, ctx.orgId))

  const [pendentesRow] = await db
    .select({
      total: sql<string>`coalesce(sum(cast(${honorarios.valor} as numeric)), 0)`,
    })
    .from(honorarios)
    .where(
      and(
        eq(honorarios.orgId, ctx.orgId),
        sql`${honorarios.statusPagamento} in ('pendente', 'parcial')`,
      ),
    )

  const totalRecebido = Number(recebidoRow?.total ?? 0)
  const totalPendente = Number(pendentesRow?.total ?? 0)

  return {
    totalRecebido,
    totalPendente,
    saldoDisponivel: totalRecebido,
  }
}
