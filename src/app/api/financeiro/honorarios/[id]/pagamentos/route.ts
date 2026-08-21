/**
 * POST /api/financeiro/honorarios/:id/pagamentos
 *
 * Registra uma parcela paga em um honorário.
 * Após inserir, recalcula status_pagamento automaticamente.
 *
 * Para remover um pagamento: DELETE /api/financeiro/honorarios/:id/pagamentos/:pgId
 *
 * Isolamento multi-tenant via requireOrgContext().
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import { addPagamento } from '@/services/financeiro'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await requireOrgContext()
    const { id: honorarioId } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 422 })
    }

    const { valor, dataPagamento, descricao } = body as {
      valor?: number
      dataPagamento?: string
      descricao?: string
    }

    if (typeof valor !== 'number' || valor <= 0) {
      return NextResponse.json({ error: 'valor deve ser um número positivo' }, { status: 400 })
    }

    if (!dataPagamento || typeof dataPagamento !== 'string') {
      return NextResponse.json({ error: 'dataPagamento é obrigatória' }, { status: 400 })
    }

    const pagamento = await addPagamento(ctx, honorarioId, {
      valor,
      dataPagamento,
      descricao,
    })

    return NextResponse.json(pagamento, { status: 201 })
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

    console.error('[POST /api/financeiro/honorarios/:id/pagamentos] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
