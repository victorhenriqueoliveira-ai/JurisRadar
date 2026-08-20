/**
 * GET /api/calendario?de=YYYY-MM-DD&ate=YYYY-MM-DD
 *
 * Retorna eventos de calendário do período para a organização autenticada.
 * Isolamento multi-tenant via requireOrgContext() (ADR-002).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { getEventosByPeriod } from '@/services/calendario'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    const { searchParams } = request.nextUrl
    const de = searchParams.get('de')
    const ate = searchParams.get('ate')

    if (!de || !ate) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: de=YYYY-MM-DD&ate=YYYY-MM-DD' },
        { status: 400 },
      )
    }

    // Validação simples de formato de data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(de) || !dateRegex.test(ate)) {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use YYYY-MM-DD.' },
        { status: 400 },
      )
    }

    if (de > ate) {
      return NextResponse.json(
        { error: 'Parâmetro "de" deve ser anterior ou igual a "ate".' },
        { status: 400 },
      )
    }

    const eventos = await getEventosByPeriod(ctx, de, ate)

    return NextResponse.json({ data: eventos })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/calendario] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
