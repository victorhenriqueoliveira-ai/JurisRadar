/**
 * DELETE /api/processos/:id/notas/:notaId
 *
 * Remove uma nota interna.
 * Apenas o autor da nota OU sócio pode deletar.
 *
 * Isolamento multi-tenant garantido pelo service layer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { deleteNota } from '@/services/processos'

interface RouteParams {
  params: Promise<{ id: string; notaId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext()
    const { notaId } = await params

    await deleteNota(ctx, notaId)

    return NextResponse.json({ success: true })
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

    console.error('[DELETE /api/processos/:id/notas/:notaId] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
