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
import { db } from '@/db'
import { processos } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

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

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 422 })
    }

    const { numeroCnj, tribunal } = body as { numeroCnj?: string; tribunal?: string }

    if (!numeroCnj || typeof numeroCnj !== 'string' || numeroCnj.trim().length < 5) {
      return NextResponse.json(
        { error: 'numeroCnj é obrigatório e deve ter ao menos 5 caracteres' },
        { status: 422 }
      )
    }

    const existing = await db
      .select({ id: processos.id })
      .from(processos)
      .where(and(eq(processos.orgId, ctx.orgId), eq(processos.numeroCnj, numeroCnj.trim())))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'Processo já monitorado', id: existing[0].id },
        { status: 200 }
      )
    }

    const [novo] = await db
      .insert(processos)
      .values({
        orgId: ctx.orgId,
        numeroCnj: numeroCnj.trim(),
        tribunal: tribunal ?? null,
        status: 'ativo',
        responsavelId: ctx.userId,
      })
      .returning({ id: processos.id, numeroCnj: processos.numeroCnj })

    return NextResponse.json(
      { message: 'Processo adicionado ao CRM', id: novo.id, numeroCnj: novo.numeroCnj },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[POST /api/processos] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
