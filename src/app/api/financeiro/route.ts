/**
 * GET /api/financeiro
 *
 * Retorna o dashboard financeiro: total a receber, recebido e em atraso.
 * Isolamento multi-tenant via requireOrgContext() — nunca expõe dados de outros escritórios.
 *
 * Query params: ?inicio=YYYY-MM&fim=YYYY-MM
 * Response: { totalAReceber, totalRecebido, emAtraso, periodo }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { getDashboardFinanceiro } from '@/services/financeiro'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    const { searchParams } = request.nextUrl
    const periodo = {
      inicio: searchParams.get('inicio') ?? undefined,
      fim: searchParams.get('fim') ?? undefined,
    }

    const dashboard = await getDashboardFinanceiro(ctx, periodo)

    return NextResponse.json(dashboard)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/financeiro] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
