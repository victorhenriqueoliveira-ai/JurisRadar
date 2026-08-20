/**
 * GET /api/dashboard
 *
 * Retorna métricas agregadas do dashboard analítico.
 * Query params:
 *   ?scope=pessoal|escritorio  — sócios podem ver dados do escritório inteiro
 *
 * Response: DashboardData com KPIs, distribuições e evolução mensal.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { aggregateDashboard } from '@/services/dashboard'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    const { searchParams } = request.nextUrl
    const scopeParam = searchParams.get('scope')
    const scope = scopeParam === 'escritorio' ? 'escritorio' : 'pessoal'

    const data = await aggregateDashboard(ctx, scope)

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[GET /api/dashboard] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
