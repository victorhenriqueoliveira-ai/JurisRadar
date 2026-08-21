/**
 * GET /api/notificacoes/count
 *
 * Retorna a contagem de notificações não lidas do usuário autenticado.
 * Endpoint leve projetado para polling de 30s no AppHeader.
 *
 * Response: { count: number }
 */

import { NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { countNotificacoesNaoLidas } from '@/services/notificacoes'

export async function GET() {
  try {
    const ctx = await requireOrgContext()

    const count = await countNotificacoesNaoLidas(ctx)

    return NextResponse.json({ count })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/notificacoes/count] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
