import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context'
import { moveKanbanCard } from '@/services/kanban'
import { ValidationError, ForbiddenError, NotFoundError } from '@/lib/errors'
import type { ColId } from '@/services/kanban'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireOrgContext()
    const { id } = await params
    const body = await req.json() as Record<string, unknown>
    const card = await moveKanbanCard(ctx, id, body.coluna as ColId)
    return NextResponse.json(card)
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
