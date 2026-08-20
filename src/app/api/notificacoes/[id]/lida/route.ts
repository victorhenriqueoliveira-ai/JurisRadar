/**
 * PATCH /api/notificacoes/[id]/lida
 *
 * Marca uma notificação específica como lida.
 * Retorna 403 (não 404) se a notificação pertencer a outro usuário.
 *
 * Response: { ok: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { marcarLida } from '@/services/notificacoes'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireOrgContext()
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    await marcarLida(ctx, id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    console.error('[PATCH /api/notificacoes/[id]/lida] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
