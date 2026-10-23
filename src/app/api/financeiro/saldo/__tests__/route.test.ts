/**
 * Testes unitários — GET /api/financeiro/saldo
 *
 * Cobre:
 *   - 401 sem sessão/org
 *   - 200 com o saldo retornado pelo serviço
 *   - 404 quando a org não tem sub-conta Asaas (AsaasError NOT_FOUND)
 *   - 502 em qualquer outro erro vindo da Asaas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  consultarSaldoOrg: vi.fn(),
}))

// ── Imports após vi.mock ──────────────────────────────────────────────────────

import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { AsaasError } from '@/lib/asaas/errors'
import { consultarSaldoOrg } from '@/services/financeiro'
import { GET } from '@/app/api/financeiro/saldo/route'

// ── Testes ────────────────────────────────────────────────────────────────────

describe('GET /api/financeiro/saldo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando não autenticado', async () => {
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError())

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('retorna 200 com o saldo quando a consulta é bem-sucedida', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({ orgId: 'org-a', userId: 'user-1', role: 'socio' })
    vi.mocked(consultarSaldoOrg).mockResolvedValue(5210.96)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ saldo: 5210.96 })
  })

  it('retorna 404 quando a org não tem sub-conta Asaas (AsaasError NOT_FOUND)', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({ orgId: 'org-a', userId: 'user-1', role: 'socio' })
    vi.mocked(consultarSaldoOrg).mockRejectedValue(new AsaasError('Sem sub-conta', 'NOT_FOUND', 404))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toContain('Asaas')
  })

  it('retorna 502 quando a Asaas retorna outro erro', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({ orgId: 'org-a', userId: 'user-1', role: 'socio' })
    vi.mocked(consultarSaldoOrg).mockRejectedValue(new AsaasError('Erro interno Asaas', 'HTTP_500', 500))

    const response = await GET()

    expect(response.status).toBe(502)
  })

  it('retorna 500 em erro inesperado', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({ orgId: 'org-a', userId: 'user-1', role: 'socio' })
    vi.mocked(consultarSaldoOrg).mockRejectedValue(new Error('boom'))

    const response = await GET()

    expect(response.status).toBe(500)
  })
})
