/**
 * Testes unitários — GET/POST /api/financeiro/saques
 *
 * Cobre:
 *   GET:
 *     - 401 sem sessão
 *     - 200 com o histórico de saques
 *   POST:
 *     - 422 body inválido
 *     - 400 pixAddressKeyType inválido
 *     - 401 / 403 / 400 propagados do serviço
 *     - 404 quando a org não tem sub-conta Asaas (AsaasError NOT_FOUND)
 *     - 502 em outro erro Asaas
 *     - 201 em sucesso
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/org-context', () => ({
  requireOrgContext: vi.fn(),
}))

vi.mock('@/lib/errors', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {
    readonly status = 401
    constructor(message = 'Não autenticado') {
      super(message)
      this.name = 'UnauthorizedError'
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    readonly status = 403
    constructor(message = 'Acesso negado') {
      super(message)
      this.name = 'ForbiddenError'
    }
  },
  ValidationError: class ValidationError extends Error {
    readonly status = 400
    constructor(message = 'Dados inválidos') {
      super(message)
      this.name = 'ValidationError'
    }
  },
}))

vi.mock('@/lib/asaas/errors', () => ({
  AsaasError: class AsaasError extends Error {
    code: string
    httpStatus?: number
    constructor(message: string, code = 'UNKNOWN', httpStatus?: number) {
      super(message)
      this.name = 'AsaasError'
      this.code = code
      this.httpStatus = httpStatus
    }
  },
}))

vi.mock('@/services/financeiro', () => ({
  listarSaques: vi.fn(),
  solicitarSaque: vi.fn(),
}))

// ── Imports após vi.mock ──────────────────────────────────────────────────────

import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors'
import { AsaasError } from '@/lib/asaas/errors'
import { listarSaques, solicitarSaque } from '@/services/financeiro'
import { GET, POST } from '@/app/api/financeiro/saques/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CTX = { orgId: 'org-a', userId: 'user-1', role: 'socio' as const }

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/financeiro/saques', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeInvalidJsonRequest(): NextRequest {
  return new NextRequest('http://localhost/api/financeiro/saques', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ not valid json',
  })
}

// ── Testes: GET ───────────────────────────────────────────────────────────────

describe('GET /api/financeiro/saques', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando não autenticado', async () => {
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError())

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('retorna 200 com o histórico de saques', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX)
    const historico = [{ id: 'saque-1', valor: '100', status: 'done' }]
    vi.mocked(listarSaques).mockResolvedValue(historico as never)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ data: historico })
  })
})

// ── Testes: POST ──────────────────────────────────────────────────────────────

describe('POST /api/financeiro/saques', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 422 quando o body não é um JSON válido', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX)

    const response = await POST(makeInvalidJsonRequest())

    expect(response.status).toBe(422)
  })

  it('retorna 400 quando pixAddressKeyType é inválido', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX)

    const response = await POST(
      makeRequest({ valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'BITCOIN' }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('pixAddressKeyType')
  })

  it('retorna 401 quando não autenticado', async () => {
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError())

    const response = await POST(makeRequest({ valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }))

    expect(response.status).toBe(401)
  })

  it('retorna 403 quando o usuário não é sócio', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX)
    vi.mocked(solicitarSaque).mockRejectedValue(new ForbiddenError('Apenas sócios podem solicitar saques'))

    const response = await POST(makeRequest({ valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }))

    expect(response.status).toBe(403)
  })

  it('retorna 400 quando o serviço lança ValidationError (ex: saldo insuficiente)', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX)
    vi.mocked(solicitarSaque).mockRejectedValue(new ValidationError('Valor solicitado excede o saldo disponível'))

    const response = await POST(makeRequest({ valor: 999999, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }))

    expect(response.status).toBe(400)
  })

  it('retorna 404 quando a org não tem sub-conta Asaas (AsaasError NOT_FOUND)', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX)
    vi.mocked(solicitarSaque).mockRejectedValue(new AsaasError('Sem sub-conta', 'NOT_FOUND', 404))

    const response = await POST(makeRequest({ valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }))

    expect(response.status).toBe(404)
  })

  it('retorna 502 quando a Asaas retorna outro erro', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX)
    vi.mocked(solicitarSaque).mockRejectedValue(new AsaasError('Saldo insuficiente na Asaas', 'BAD_REQUEST', 400))

    const response = await POST(makeRequest({ valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }))

    expect(response.status).toBe(502)
  })

  it('retorna 201 com o saque criado em caso de sucesso', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX)
    const saque = { id: 'saque-1', valor: '100', status: 'pending', asaasTransferId: 'transfer-abc' }
    vi.mocked(solicitarSaque).mockResolvedValue(saque as never)

    const response = await POST(makeRequest({ valor: 100, pixAddressKey: 'chave@escritorio.adv.br', pixAddressKeyType: 'EMAIL' }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toEqual(saque)
    expect(solicitarSaque).toHaveBeenCalledWith(CTX, {
      valor: 100,
      pixAddressKey: 'chave@escritorio.adv.br',
      pixAddressKeyType: 'EMAIL',
    })
  })
})
