/**
 * Testes de integração para GET /api/billing/portal
 *
 * Cobre:
 * - 401 quando não autenticado
 * - 400 quando a org não tem stripe_customer_id
 * - Redirect para URL do Customer Portal quando tudo está OK
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSelectLimit = vi.fn()
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }))
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }))

vi.mock('@/db', () => ({
  db: {
    select: () => ({ from: mockSelectFrom }),
  },
}))

vi.mock('@/db/schema', () => ({
  subscriptions: { orgId: 'org_id', stripeCustomerId: 'stripe_customer_id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_a: unknown, _b: unknown) => 'eq_clause'),
}))

const mockPortalCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: mockPortalCreate,
      },
    },
  },
}))

const mockRequireOrgContext = vi.fn()
vi.mock('@/lib/org-context', () => ({
  requireOrgContext: mockRequireOrgContext,
  UnauthorizedError: class UnauthorizedError extends Error {
    status = 401
    constructor(msg = 'Não autenticado') {
      super(msg)
      this.name = 'UnauthorizedError'
    }
  },
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/billing/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user with orgId
    mockRequireOrgContext.mockResolvedValue({
      orgId: 'org-123',
      userId: 'user-123',
      role: 'socio',
    })
    process.env.NEXTAUTH_URL = 'https://app.jurisradar.com.br'
  })

  it('retorna 401 quando não autenticado', async () => {
    const { UnauthorizedError } = await import('@/lib/org-context')
    mockRequireOrgContext.mockRejectedValue(new UnauthorizedError())

    const { GET } = await import('../portal/route')
    const response = await GET()

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Não autenticado')
  })

  it('retorna 400 quando org não tem stripe_customer_id', async () => {
    mockSelectLimit.mockResolvedValue([]) // nenhuma subscription

    const { GET } = await import('../portal/route')
    const response = await GET()

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Sem assinatura ativa')
  })

  it('redireciona para URL do Customer Portal quando stripe_customer_id existe', async () => {
    mockSelectLimit.mockResolvedValue([{ stripeCustomerId: 'cus_test_123' }])
    mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session/abc' })

    const { GET } = await import('../portal/route')
    const response = await GET()

    // NextResponse.redirect retorna status 307
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://billing.stripe.com/session/abc')

    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: 'cus_test_123',
      return_url: 'https://app.jurisradar.com.br/configuracoes/billing',
    })
  })
})
