/**
 * GET /api/calendario/export.ics
 *
 * Gera e retorna arquivo iCal (RFC 5545) com os eventos do mês corrente
 * para a organização autenticada.
 *
 * Content-Type: text/calendar; charset=utf-8
 * Content-Disposition: attachment; filename="jurisradar-calendario.ics"
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { getEventosByPeriod, gerarIcal } from '@/services/calendario'

export async function GET(_request: NextRequest) {
  try {
    const ctx = await requireOrgContext()

    // Período: mês corrente (1º ao último dia)
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth() // 0-indexed

    const de = new Date(ano, mes, 1).toISOString().slice(0, 10)
    const ate = new Date(ano, mes + 1, 0).toISOString().slice(0, 10)

    const eventos = await getEventosByPeriod(ctx, de, ate)
    const ical = gerarIcal(eventos)

    return new NextResponse(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="jurisradar-calendario.ics"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/calendario/export.ics] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
