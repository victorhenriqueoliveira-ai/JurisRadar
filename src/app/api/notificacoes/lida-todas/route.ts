/**
 * PATCH /api/notificacoes/lida-todas
 *
 * Marca todas as notificações não lidas do usuário autenticado como lidas.
 * Isolamento garantido: afeta APENAS notificações do userId + orgId autenticados.
 *
 * Response: { ok: true, updated: number }
 */

import { NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { marcarTodasLidas } from '@/services/notificacoes'

export async function PATCH() {
  try {
    const ctx = await requireOrgContext()

    const updated = await marcarTodasLidas(ctx)

    return NextResponse.json({ ok: true, updated })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[PATCH /api/notificacoes/lida-todas] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
