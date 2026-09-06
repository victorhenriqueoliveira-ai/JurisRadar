import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context'
import { listTarefas, createTarefa } from '@/services/tarefas'
import { ValidationError } from '@/lib/errors'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const data = await listTarefas(ctx)
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
    const tarefa = await createTarefa(ctx, {
      titulo: String(body.titulo ?? ''),
      processoRef: body.processoRef != null ? String(body.processoRef) : undefined,
      prioridade: body.prioridade != null ? String(body.prioridade) : undefined,
      prazo: body.prazo != null ? String(body.prazo) : undefined,
      status: body.status != null ? String(body.status) : undefined,
    })
    return NextResponse.json(tarefa, { status: 201 })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
