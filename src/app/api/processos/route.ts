/**
 * GET /api/processos
 *
 * Lista processos da organização autenticada com filtros e paginação por cursor.
 * Isolamento multi-tenant via requireOrgContext() — nunca expõe dados de outros escritórios.
 *
 * Query params: status, area, tribunal, responsavel_id, urgencia, q, cursor, limit
 * Response: { data: Processo[], nextCursor: string | null, total: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { listProcessos } from '@/services/processos'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    const { searchParams } = request.nextUrl

    const filters = {
      status: searchParams.get('status') ?? undefined,
      area: searchParams.get('area') ?? undefined,
      tribunal: searchParams.get('tribunal') ?? undefined,
      responsavel_id: searchParams.get('responsavel_id') ?? undefined,
      urgencia: searchParams.get('urgencia') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    }

    const result = await listProcessos(ctx, filters)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/processos] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
