/**
 * GET /api/processos/:id  — detalhe do processo com movimentações, honorário e notas
 * PATCH /api/processos/:id — atualizar responsavel_id e/ou status (papel ≥ associado)
 * DELETE /api/processos/:id — arquivamento soft (seta arquivado_at, não deleta)
 *
 * Isolamento multi-tenant garantido pelo service layer.
 * Retorna 403 (não 404) quando o processo pertencer a outro escritório.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import { getProcesso, archiveProcesso, updateProcesso } from '@/services/processos'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext()
    const { id } = await params

    const processo = await getProcesso(ctx, id)

    if (!processo) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 })
    }

    return NextResponse.json(processo)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[GET /api/processos/:id] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext()
    const { id } = await params

    const body = await request.json()

    // Apenas responsavel_id e status são permitidos via PATCH
    const allowedFields: Record<string, unknown> = {}
    if ('responsavel_id' in body) {
      allowedFields.responsavelId = body.responsavel_id
    }
    if ('status' in body) {
      allowedFields.status = body.status
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido fornecido. Use: responsavel_id, status' },
        { status: 400 },
      )
    }

    await updateProcesso(ctx, id, allowedFields)

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
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('[PATCH /api/processos/:id] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext()
    const { id } = await params

    await archiveProcesso(ctx, id)

    return NextResponse.json({ success: true, message: 'Processo arquivado' })
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

    console.error('[DELETE /api/processos/:id] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
