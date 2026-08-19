/**
 * POST /api/processos/:id/notas
 *
 * Adiciona uma nota interna ao processo.
 * Papel mínimo: associado.
 * Body: { conteudo: string }
 *
 * Isolamento multi-tenant garantido pelo service layer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import { addNota } from '@/services/processos'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext()
    const { id } = await params

    let body: { conteudo?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    if (!body.conteudo || typeof body.conteudo !== 'string' || body.conteudo.trim().length === 0) {
      return NextResponse.json({ error: 'conteudo não pode ser vazio' }, { status: 400 })
    }

    const nota = await addNota(ctx, id, body.conteudo)

    return NextResponse.json(nota, { status: 201 })
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
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('[POST /api/processos/:id/notas] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
