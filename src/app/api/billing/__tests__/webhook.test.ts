/**
 * Testes de integração para POST /api/billing/webhook
 *
 * A rota processa eventos da Asaas (migração do Stripe concluída na Fase 5),
 * não mais eventos do Stripe — autenticação via header `asaas-access-token`,
 * payload com `payment`/`subscription`, idempotência via `asaas_event_id`.
 *
 * Cobre:
 * - 401 quando o token do header está ausente ou incorreto
 * - skip (received: true) quando falta orgId ou eventId no payload
 * - idempotência: evento já processado não é reprocessado
 * - mapeamento de evento → status (PAYMENT_RECEIVED/CONFIRMED → active,
 *   PAYMENT_OVERDUE → past_due, SUBSCRIPTION_DELETED → canceled)
 * - eventos não mapeados são apenas confirmados (received: true)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSelectLimit = vi.fn()
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }))
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }))
const mockUpdateSet = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }))

vi.mock('@/db', () => ({
  db: {
    select: () => ({ from: mockSelectFrom }),
    update: () => mockUpdate(),
  },
}))

vi.mock('@/db/schema', () => ({
  subscriptions: { id: 'id', orgId: 'org_id', status: 'status', asaasEventId: 'asaas_event_id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq_clause'),
}))

import { POST } from '../webhook/route'

const WEBHOOK_TOKEN = 'test-webhook-token'

function makeRequest(body: unknown, token: string | null = WEBHOOK_TOKEN): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token !== null) headers['asaas-access-token'] = token
  return new NextRequest('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/billing/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ASAAS_WEBHOOK_TOKEN = WEBHOOK_TOKEN
    mockSelectLimit.mockResolvedValue([]) // por padrão: evento não processado ainda
  })

  it('retorna 401 quando o header asaas-access-token está ausente', async () => {
    const response = await POST(makeRequest({ event: 'PAYMENT_RECEIVED' }, null))
    expect(response.status).toBe(401)
  })

  it('retorna 401 quando o token não confere', async () => {
    const response = await POST(makeRequest({ event: 'PAYMENT_RECEIVED' }, 'token-errado'))
    expect(response.status).toBe(401)
  })

  it('retorna received:true sem processar quando falta orgId/eventId', async () => {
    const response = await POST(makeRequest({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', status: 'RECEIVED', value: 100 } }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.received).toBe(true)
    expect(body.skipped).toBeDefined()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('é idempotente: não reprocessa um evento já registrado', async () => {
    mockSelectLimit.mockResolvedValue([{ id: 'sub-1' }])

    const response = await POST(makeRequest({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_1', externalReference: 'org-1', status: 'RECEIVED', value: 100 },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.idempotent).toBe(true)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ['PAYMENT_RECEIVED', 'active'],
    ['PAYMENT_CONFIRMED', 'active'],
    ['PAYMENT_OVERDUE', 'past_due'],
  ])('mapeia evento de pagamento %s para status %s', async (event, status) => {
    const response = await POST(makeRequest({
      event,
      payment: { id: 'pay_1', externalReference: 'org-1', status: 'RECEIVED', value: 100 },
    }))

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status, asaasEventId: 'pay_1' }))
  })

  it('mapeia SUBSCRIPTION_DELETED para status canceled usando payload de subscription', async () => {
    const response = await POST(makeRequest({
      event: 'SUBSCRIPTION_DELETED',
      subscription: { id: 'sub_asaas_1', externalReference: 'org-1', status: 'INACTIVE' },
    }))

    expect(response.status).toBe(200)
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'canceled', asaasEventId: 'sub_asaas_1' }))
  })

  it('confirma recebimento sem atualizar nada para eventos não mapeados', async () => {
    const response = await POST(makeRequest({
      event: 'PAYMENT_CREATED',
      payment: { id: 'pay_2', externalReference: 'org-1', status: 'PENDING', value: 100 },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.received).toBe(true)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
