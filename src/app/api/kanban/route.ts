import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context'
import { listKanbanCards, createKanbanCard } from '@/services/kanban'
import { ValidationError } from '@/lib/errors'
import type { ColId } from '@/services/kanban'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const data = await listKanbanCards(ctx)
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgContext()
    const body = await req.json() as Record<string, unknown>
    const card = await createKanbanCard(ctx, {
      titulo: String(body.titulo ?? ''),
      coluna: body.coluna != null ? (body.coluna as ColId) : undefined,
      prioridade: body.prioridade != null ? String(body.prioridade) : undefined,
      tag: body.tag != null ? String(body.tag) : undefined,
      prazo: body.prazo != null ? String(body.prazo) : undefined,
    })
    return NextResponse.json(card, { status: 201 })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
