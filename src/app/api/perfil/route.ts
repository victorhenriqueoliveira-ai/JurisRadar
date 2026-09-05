import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context'
import { getPerfilUsuario, updatePerfilUsuario } from '@/services/perfil'
import { ValidationError } from '@/lib/errors'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const perfil = await getPerfilUsuario(ctx)
    return NextResponse.json(perfil)
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireOrgContext()
    const body = await req.json() as Record<string, string>
    const perfil = await updatePerfilUsuario(ctx, {
      name: body.name,
      oabNumero: body.oabNumero,
      oabEstado: body.oabEstado,
    })
    return NextResponse.json(perfil)
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
