/**
 * GET /api/notificacoes
 *
 * Lista notificações do usuário autenticado com filtros e paginação por cursor.
 * Isolamento multi-tenant via requireOrgContext() — nunca expõe notificações de outros usuários.
 *
 * Query params: lida (boolean), cursor, limit
 * Response: { data: Notificacao[], nextCursor: string | null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { listNotificacoes } from '@/services/notificacoes'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    const { searchParams } = request.nextUrl

    const lidaParam = searchParams.get('lida')
    const filters = {
      lida: lidaParam !== null ? lidaParam === 'true' : undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    }

    const result = await listNotificacoes(ctx, filters)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/notificacoes] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
