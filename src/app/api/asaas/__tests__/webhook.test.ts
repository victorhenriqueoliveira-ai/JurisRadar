/**
 * Testes unitários para POST /api/asaas/webhook.
 *
 * Cobrem:
 * - Rejeição de token ausente ou inválido (401)
 * - Atualização de cobrancas.status para cada evento suportado
 * - Recálculo de honorarios.statusPagamento (quitado / parcial / pendente)
 * - Idempotência (mesmo evento duas vezes não duplica atualização)
 * - Evento desconhecido → 200 sem alterar banco
 * - externalReference não encontrado → 200 sem alterar banco
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()

// Encadeia .set().where() para update
const mockSetFn = vi.fn()
const mockUpdateWhereFn = vi.fn()
mockSetFn.mockReturnValue({ where: mockUpdateWhereFn })
mockDbUpdate.mockReturnValue({ set: mockSetFn })

vi.mock('@/db', () => ({
  db: {
    select: () => mockDbSelect(),
    update: () => mockDbUpdate(),
  },
}))

vi.mock('@/db/schema', () => ({
  cobrancas: { id: 'id', honorarioId: 'honorario_id', status: 'status' },
  honorarios: { id: 'id', statusPagamento: 'status_pagamento' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}))

// ── Import após vi.mock ───────────────────────────────────────────────────────

import { POST } from '../webhook/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOKEN_VALIDO = 'token-secreto-asaas'

function criarRequest(
  body: Record<string, unknown>,
  token?: string,
): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token !== undefined) {
    headers['asaas-access-token'] = token
  }
  return new NextRequest('http://localhost/api/asaas/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// Mock de cobrança encontrada no banco
function mockCobrancaEncontrada(
  cobrancaId: string,
  honorarioId: string,
  statusAtual: string,
  todasCobrancasDoHonorario: { status: string }[],
) {
  // Primeira chamada: select cobrancas by id
  // Segunda chamada: select all cobrancas by honorarioId
  mockDbSelect
    .mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              { id: cobrancaId, status: statusAtual, honorarioId },
            ]),
        }),
      }),
    })
    .mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve(todasCobrancasDoHonorario),
      }),
    })
}

function mockCobrancaNaoEncontrada() {
  mockDbSelect.mockReturnValueOnce({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  })
}

// ── Configuração do ambiente ──────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks()
  // Restaurar implementação de encadeamento após resetAllMocks
  mockSetFn.mockReturnValue({ where: mockUpdateWhereFn })
  mockDbUpdate.mockReturnValue({ set: mockSetFn })
  mockUpdateWhereFn.mockResolvedValue(undefined)
  process.env.ASAAS_WEBHOOK_TOKEN = TOKEN_VALIDO
})

// ── Testes ────────────────────────────────────────────────────────────────────

describe('POST /api/asaas/webhook — validação de token', () => {
  it('retorna 401 quando header asaas-access-token está ausente', async () => {
    const req = criarRequest({ event: 'PAYMENT_RECEIVED' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('retorna 401 quando token é inválido', async () => {
    const req = criarRequest({ event: 'PAYMENT_RECEIVED' }, 'token-errado')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('aceita token correto e processa o evento', async () => {
    mockCobrancaEncontrada('cobranca-001', 'honorario-001', 'pending', [
      { status: 'received' },
    ])
    const req = criarRequest(
      {
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/asaas/webhook — PAYMENT_RECEIVED', () => {
  it('atualiza cobrancas.status para "received"', async () => {
    mockCobrancaEncontrada('cobranca-001', 'honorario-001', 'pending', [
      { status: 'received' },
    ])
    const req = criarRequest(
      {
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    await POST(req)
    expect(mockSetFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'received' }),
    )
  })

  it('define honorarios.statusPagamento = "quitado" quando todas as cobranças estão received', async () => {
    mockCobrancaEncontrada('cobranca-001', 'honorario-001', 'pending', [
      { status: 'received' },
      { status: 'received' },
      { status: 'received' },
    ])
    const req = criarRequest(
      {
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    await POST(req)
    // Segunda chamada ao set() é para o honorário
    expect(mockSetFn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ statusPagamento: 'quitado' }),
    )
  })

  it('define honorarios.statusPagamento = "parcial" quando primeira de 3 parcelas é received', async () => {
    mockCobrancaEncontrada('cobranca-001', 'honorario-001', 'pending', [
      { status: 'received' },
      { status: 'pending' },
      { status: 'pending' },
    ])
    const req = criarRequest(
      {
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    await POST(req)
    expect(mockSetFn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ statusPagamento: 'parcial' }),
    )
  })
})

describe('POST /api/asaas/webhook — outros eventos suportados', () => {
  it('atualiza cobrancas.status para "overdue" em PAYMENT_OVERDUE', async () => {
    mockCobrancaEncontrada('cobranca-001', 'honorario-001', 'pending', [
      { status: 'overdue' },
    ])
    const req = criarRequest(
      {
        event: 'PAYMENT_OVERDUE',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    await POST(req)
    expect(mockSetFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'overdue' }),
    )
  })

  it('atualiza cobrancas.status para "refunded" em PAYMENT_REFUNDED', async () => {
    mockCobrancaEncontrada('cobranca-001', 'honorario-001', 'received', [
      { status: 'refunded' },
    ])
    const req = criarRequest(
      {
        event: 'PAYMENT_REFUNDED',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    await POST(req)
    expect(mockSetFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'refunded' }),
    )
  })

  it('atualiza cobrancas.status para "cancelled" em PAYMENT_CANCELLED', async () => {
    mockCobrancaEncontrada('cobranca-001', 'honorario-001', 'pending', [
      { status: 'cancelled' },
    ])
    const req = criarRequest(
      {
        event: 'PAYMENT_CANCELLED',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    await POST(req)
    expect(mockSetFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
    )
  })
})

describe('POST /api/asaas/webhook — idempotência', () => {
  it('não duplica atualização quando evento já foi processado (status já correto)', async () => {
    // A cobrança já está no status "received" antes do evento chegar novamente
    mockDbSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              { id: 'cobranca-001', status: 'received', honorarioId: 'honorario-001' },
            ]),
        }),
      }),
    })
    const req = criarRequest(
      {
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.idempotent).toBe(true)
    // Nenhum update deve ter sido chamado
    expect(mockSetFn).not.toHaveBeenCalled()
  })
})

describe('POST /api/asaas/webhook — eventos e referências inválidas', () => {
  it('retorna 200 sem alterar banco para evento desconhecido (ex: SUBSCRIPTION_CREATED)', async () => {
    const req = criarRequest(
      {
        event: 'SUBSCRIPTION_CREATED',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(mockDbSelect).not.toHaveBeenCalled()
    expect(mockSetFn).not.toHaveBeenCalled()
  })

  it('retorna 200 quando externalReference não é encontrado em cobrancas', async () => {
    mockCobrancaNaoEncontrada()
    const req = criarRequest(
      {
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_inexistente', externalReference: 'id-inexistente' },
      },
      TOKEN_VALIDO,
    )
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(mockSetFn).not.toHaveBeenCalled()
  })

  it('retorna 200 sem alterar banco quando payment.externalReference está ausente', async () => {
    const req = criarRequest(
      {
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_001' },
      },
      TOKEN_VALIDO,
    )
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(mockSetFn).not.toHaveBeenCalled()
  })
})

describe('POST /api/asaas/webhook — recálculo honorarios.statusPagamento', () => {
  it('define statusPagamento = "pendente" quando nenhuma cobrança está received', async () => {
    mockCobrancaEncontrada('cobranca-001', 'honorario-001', 'pending', [
      { status: 'overdue' },
      { status: 'pending' },
    ])
    const req = criarRequest(
      {
        event: 'PAYMENT_OVERDUE',
        payment: { id: 'pay_001', externalReference: 'cobranca-001' },
      },
      TOKEN_VALIDO,
    )
    await POST(req)
    expect(mockSetFn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ statusPagamento: 'pendente' }),
    )
  })
})
