/**
 * GET /api/dashboard/movimentacoes-recentes
 *
 * Retorna as últimas 10 movimentações da organização.
 * Response: MovimentacaoRecente[]
 */

import { NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { getMovimentacoesRecentes } from '@/services/dashboard'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const data = await getMovimentacoesRecentes(ctx)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/dashboard/movimentacoes-recentes] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
