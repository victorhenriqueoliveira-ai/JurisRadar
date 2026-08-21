/**
 * GET /api/dashboard/prazos
 *
 * Retorna até 5 prazos mais críticos (mais próximos) da organização.
 * Response: PrazoUrgente[]
 */

import { NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { getPrazosUrgentes } from '@/services/dashboard'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const data = await getPrazosUrgentes(ctx)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/dashboard/prazos] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
