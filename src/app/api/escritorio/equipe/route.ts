import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context'
import { getEquipe, getPlanoAtual, convidarMembro } from '@/services/escritorio'
import { ValidationError } from '@/lib/errors'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const [equipe, plano] = await Promise.all([getEquipe(ctx), getPlanoAtual(ctx)])
    return NextResponse.json({ equipe, plano })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgContext()
    const body = await req.json() as Record<string, string>
    const result = await convidarMembro(ctx, {
      email: body.email ?? '',
      role: (body.role ?? 'associado') as 'socio' | 'associado' | 'estagiario',
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
