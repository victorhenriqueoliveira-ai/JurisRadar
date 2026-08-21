import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import { listHonorarios, createOrUpdateHonorario, createHonorarioAvulso } from '@/services/financeiro'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    const { searchParams } = request.nextUrl
    const filters = {
      status: (searchParams.get('status') as 'pendente' | 'parcial' | 'quitado' | undefined) ?? undefined,
      inicio: searchParams.get('inicio') ?? undefined,
      fim: searchParams.get('fim') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    }

    const result = await listHonorarios(ctx, filters)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('[GET /api/financeiro/honorarios] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 422 })
    }

    const { processoId, tipo, valor, dataPrevista, statusPagamento } = body as {
      processoId?: string
      tipo?: string
      valor?: number
      dataPrevista?: string
      statusPagamento?: string
    }

    if (typeof valor !== 'number' || valor < 0) {
      return NextResponse.json({ error: 'valor deve ser um número não-negativo' }, { status: 400 })
    }
    if (!tipo || typeof tipo !== 'string' || tipo.trim().length === 0) {
      return NextResponse.json({ error: 'tipo é obrigatório' }, { status: 400 })
    }

    const honorario = processoId
      ? await createOrUpdateHonorario(ctx, { processoId, tipo, valor, dataPrevista, statusPagamento })
      : await createHonorarioAvulso(ctx, { tipo, valor, dataPrevista })

    return NextResponse.json(honorario, { status: 201 })
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
    console.error('[POST /api/financeiro/honorarios] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
