/**
 * GET /api/financeiro/saldo
 *
 * Retorna o saldo real disponível na sub-conta Asaas do escritório.
 * Resposta: 200 { saldo: number } | 401 | 404 (sem sub-conta Asaas) | 502 (erro Asaas)
 */

import { NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { AsaasError } from '@/lib/asaas/errors'
import { consultarSaldoOrg } from '@/services/financeiro'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const saldo = await consultarSaldoOrg(ctx)
    return NextResponse.json({ saldo })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof AsaasError) {
      if (error.code === 'NOT_FOUND') {
        return NextResponse.json(
          { error: 'Escritório ainda não tem conta de recebimento Asaas conectada.' },
          { status: 404 },
        )
      }
      console.error('[GET /api/financeiro/saldo] erro Asaas:', error)
      return NextResponse.json({ error: 'Erro ao consultar saldo na Asaas.' }, { status: 502 })
    }
    console.error('[GET /api/financeiro/saldo] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
