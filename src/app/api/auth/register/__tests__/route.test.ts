/**
 * Testes unitários — POST /api/auth/register
 *
 * Cobre a Fase 4 (LGPD): rate limiting por IP e exigência de aceite dos
 * Termos de Uso / Política de Privacidade, além de persistir
 * termsAcceptedAt/termsVersion no cadastro.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/rate-limit', () => ({
  checarRateLimitCadastro: vi.fn(),
  extrairIp: vi.fn(() => '203.0.113.5'),
}))

vi.mock('bcryptjs', () => ({
  hash: vi.fn(async () => 'hashed-password'),
}))

const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', email: 'email' },
  organizations: { id: 'id', slug: 'slug' },
  orgMembers: { id: 'id' },
  subscriptions: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
}))

// ── Imports após vi.mock ──────────────────────────────────────────────────────

import { checarRateLimitCadastro } from '@/lib/rate-limit'
import { POST } from '../route'

// ── Helpers ───────────────────────────────────────────────────────────────────

const BODY_VALIDO = {
  email: 'advogado@escritorio.com.br',
  password: 'senha12345',
  name: 'Maria Advogada',
  aceiteTermos: true,
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockFluxoCadastroCompleto() {
  // select users (email não existe) → []
  // select organizations (slug único) → []
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  })

  let callCount = 0
  mockDbInsert.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      // insert users
      return { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: 'user-1' }]) }
    }
    if (callCount === 2) {
      // insert organizations
      return { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: 'org-1' }]) }
    }
    // insert orgMembers / subscriptions
    return { values: vi.fn().mockResolvedValue(undefined) }
  })
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 429 quando o rate limit por IP é excedido', async () => {
    vi.mocked(checarRateLimitCadastro).mockResolvedValue(true)

    const response = await POST(makeRequest(BODY_VALIDO))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toContain('Muitas tentativas')
  })

  it('retorna 400 quando aceiteTermos não é true', async () => {
    vi.mocked(checarRateLimitCadastro).mockResolvedValue(false)

    const response = await POST(makeRequest({ ...BODY_VALIDO, aceiteTermos: false }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Termos de Uso')
  })

  it('retorna 400 quando aceiteTermos está ausente do body', async () => {
    vi.mocked(checarRateLimitCadastro).mockResolvedValue(false)
    const semAceite = { email: BODY_VALIDO.email, password: BODY_VALIDO.password, name: BODY_VALIDO.name }

    const response = await POST(makeRequest(semAceite))

    expect(response.status).toBe(400)
  })

  it('cria o usuário com termsAcceptedAt e termsVersion preenchidos quando aceiteTermos é true', async () => {
    vi.mocked(checarRateLimitCadastro).mockResolvedValue(false)
    mockFluxoCadastroCompleto()

    let capturedUserValues: Record<string, unknown> = {}
    mockDbInsert.mockImplementationOnce(() => ({
      values: vi.fn((vals) => {
        capturedUserValues = vals
        return { returning: vi.fn().mockResolvedValue([{ id: 'user-1' }]) }
      }),
    }))
    mockDbInsert.mockImplementationOnce(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'org-1' }]),
    }))
    mockDbInsert.mockImplementation(() => ({ values: vi.fn().mockResolvedValue(undefined) }))

    const response = await POST(makeRequest(BODY_VALIDO))

    expect(response.status).toBe(201)
    expect(capturedUserValues.termsVersion).toBeDefined()
    expect(capturedUserValues.termsAcceptedAt).toBeInstanceOf(Date)
  })

  it('retorna 409 quando o e-mail já está cadastrado', async () => {
    vi.mocked(checarRateLimitCadastro).mockResolvedValue(false)
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'existing-user' }]),
    })

    const response = await POST(makeRequest(BODY_VALIDO))

    expect(response.status).toBe(409)
  })
})
