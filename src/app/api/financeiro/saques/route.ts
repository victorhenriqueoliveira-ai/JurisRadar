/**
 * GET /api/financeiro/saques
 * Lista o histórico de saques do escritório, mais recentes primeiro.
 *
 * POST /api/financeiro/saques
 * Solicita um saque (transferência Pix) do saldo da sub-conta Asaas.
 * Requer papel mínimo: sócio.
 * Body: { valor: number, pixAddressKey: string, pixAddressKeyType: 'CPF'|'CNPJ'|'EMAIL'|'PHONE'|'EVP' }
 * Resposta: 201 <saque> | 400 | 401 | 403 | 404 | 502
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors'
import { AsaasError } from '@/lib/asaas/errors'
import { listarSaques, solicitarSaque } from '@/services/financeiro'

export async function GET() {
  try {
    const ctx = await requireOrgContext()
    const historico = await listarSaques(ctx)
    return NextResponse.json({ data: historico })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('[GET /api/financeiro/saques] erro inesperado:', error)
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

    const { valor, pixAddressKey, pixAddressKeyType } = body as {
      valor?: number
      pixAddressKey?: string
      pixAddressKeyType?: string
    }

    const TIPOS_VALIDOS = ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP']
    if (!pixAddressKeyType || !TIPOS_VALIDOS.includes(pixAddressKeyType)) {
      return NextResponse.json(
        { error: 'pixAddressKeyType deve ser CPF, CNPJ, EMAIL, PHONE ou EVP' },
        { status: 400 },
      )
    }

    const saque = await solicitarSaque(ctx, {
      valor: Number(valor),
      pixAddressKey: pixAddressKey ?? '',
      pixAddressKeyType: pixAddressKeyType as 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP',
    })

    return NextResponse.json(saque, { status: 201 })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof AsaasError) {
      if (error.code === 'NOT_FOUND') {
        return NextResponse.json(
          { error: 'Escritório ainda não tem conta de recebimento Asaas conectada.' },
          { status: 404 },
        )
      }
      console.error('[POST /api/financeiro/saques] erro Asaas:', error)
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('[POST /api/financeiro/saques] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
