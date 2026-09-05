import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context'
import { listConsultorias, createConsultoria } from '@/services/consultorias'
import { ValidationError } from '@/lib/errors'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const data = await listConsultorias(ctx)
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
    const consultoria = await createConsultoria(ctx, {
      titulo: String(body.titulo ?? ''),
      clienteId: body.clienteId != null ? String(body.clienteId) : undefined,
      valorEstimado: body.valorEstimado != null ? Number(body.valorEstimado) : undefined,
      data: body.data != null ? String(body.data) : undefined,
      status: body.status != null ? String(body.status) : undefined,
    })
    return NextResponse.json(consultoria, { status: 201 })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
