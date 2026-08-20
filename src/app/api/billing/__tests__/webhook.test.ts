/**
 * Testes unitários para POST /api/billing/webhook
 *
 * Todos os mocks são criados com vi.mock — sem chamadas reais ao Stripe ou banco.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Chainable mock for db.select().from().where().limit()
const mockSelectLimit = vi.fn()
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }))
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }))

// Chainable mock for db.update().set().where()
const mockUpdateWhere = vi.fn()
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }))

// Chainable mock for db.insert().values()
const mockInsertValues = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: () => ({ from: mockSelectFrom }),
    update: () => ({ set: mockUpdateSet }),
    insert: () => ({ values: mockInsertValues }),
  },
}))

vi.mock('@/db/schema', () => ({
  subscriptions: {
    id: 'id',
    stripeEventId: 'stripe_event_id',
    orgId: 'org_id',
    stripeSubscriptionId: 'stripe_subscription_id',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: (a: unknown, b: unknown) => ({ field: a, value: b }),
}))

// Mock do Stripe SDK
const mockConstructEvent = vi.fn()

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: string, sig: string | null = 'valid-sig') {
  const headers = new Headers()
  if (sig !== null) headers.set('stripe-signature', sig)
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers,
    body,
  })
}

function makeEvent(type: string, data: object, id = 'evt_test_001'): Stripe.Event {
  return {
    id,
    type,
    data: { object: data },
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/billing/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: not idempotent (event not previously processed)
    mockSelectLimit.mockResolvedValue([])
    mockUpdateWhere.mockResolvedValue(undefined)
    mockInsertValues.mockResolvedValue(undefined)

    // Re-wire the select chain after clearAllMocks
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere })
    mockSelectWhere.mockReturnValue({ limit: mockSelectLimit })
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
  })

  it('retorna 400 se o header stripe-signature estiver ausente', async () => {
    const { POST } = await import('../webhook/route')
    const req = makeRequest('{}', null)
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing stripe-signature/i)
    expect(mockConstructEvent).not.toHaveBeenCalled()
  })

  it('retorna 400 se a assinatura HMAC for inválida', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const { POST } = await import('../webhook/route')
    const req = makeRequest('{}', 'invalid-sig')
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid signature/i)
  })

  it('retorna 200 sem processar se o evento já foi processado (idempotência)', async () => {
    const event = makeEvent('invoice.payment_succeeded', { subscription: 'sub_123' })
    mockConstructEvent.mockReturnValue(event)

    // Simulate event already in DB
    mockSelectLimit.mockResolvedValue([{ id: 'existing-row' }])

    const { POST } = await import('../webhook/route')
    const req = makeRequest(JSON.stringify(event), 'valid-sig')
    const res = await POST(req as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.idempotent).toBe(true)
    // Should NOT call update or insert
    expect(mockUpdateSet).not.toHaveBeenCalled()
    expect(mockInsertValues).not.toHaveBeenCalled()
  })

  it('customer.subscription.deleted atualiza status para canceled', async () => {
    const event = makeEvent('customer.subscription.deleted', { id: 'sub_abc' })
    mockConstructEvent.mockReturnValue(event)

    const { POST } = await import('../webhook/route')
    const req = makeRequest(JSON.stringify(event), 'valid-sig')
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled', stripeEventId: 'evt_test_001' })
    )
  })

  it('invoice.payment_failed atualiza status para past_due', async () => {
    const event = makeEvent('invoice.payment_failed', { subscription: 'sub_xyz' })
    mockConstructEvent.mockReturnValue(event)

    const { POST } = await import('../webhook/route')
    const req = makeRequest(JSON.stringify(event), 'valid-sig')
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'past_due', stripeEventId: 'evt_test_001' })
    )
  })

  it('invoice.payment_succeeded atualiza status para active', async () => {
    const event = makeEvent('invoice.payment_succeeded', { subscription: 'sub_ok' })
    mockConstructEvent.mockReturnValue(event)

    const { POST } = await import('../webhook/route')
    const req = makeRequest(JSON.stringify(event), 'valid-sig')
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', stripeEventId: 'evt_test_001' })
    )
  })

  it('checkout.session.completed cria subscription com status trialing', async () => {
    const event = makeEvent('checkout.session.completed', {
      customer: 'cus_new',
      subscription: 'sub_new',
      metadata: { orgId: 'org-uuid' },
    })
    mockConstructEvent.mockReturnValue(event)

    // Second select (existing org check) also returns []
    mockSelectLimit.mockResolvedValue([])

    const { POST } = await import('../webhook/route')
    const req = makeRequest(JSON.stringify(event), 'valid-sig')
    const res = await POST(req as never)

    expect(res.status).toBe(200)
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'trialing',
        stripeCustomerId: 'cus_new',
        stripeEventId: 'evt_test_001',
      })
    )
  })
})
