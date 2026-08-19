/**
 * Testes unitários para requireOrgContext() e requireRole().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

// Mock do módulo auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/auth'
import { requireOrgContext, requireRole } from '@/lib/org-context'
import type { OrgContext } from '@/types/domain'

const mockAuth = vi.mocked(auth)

// Helper para criar sessão mock
function mockSession(overrides?: Partial<{
  id: string
  orgId: string
  role: string
  subscriptionStatus: string
}>) {
  const defaults = {
    id: 'user-uuid-1',
    orgId: 'org-uuid-1',
    role: 'socio',
    subscriptionStatus: 'trialing',
  }
  const user = { ...defaults, ...overrides }

  return {
    user,
    expires: new Date(Date.now() + 86400000).toISOString(),
  }
}

describe('requireOrgContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve retornar OrgContext correto quando sessão contém orgId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce(mockSession() as any)

    const ctx = await requireOrgContext()

    expect(ctx.orgId).toBe('org-uuid-1')
    expect(ctx.userId).toBe('user-uuid-1')
    expect(ctx.role).toBe('socio')
  })

  it('deve lançar UnauthorizedError quando não há sessão', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce(null as any)

    await expect(requireOrgContext()).rejects.toThrow(UnauthorizedError)
  })

  it('deve lançar UnauthorizedError quando sessão não tem user.id', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce({ user: { id: undefined }, expires: '' } as any)

    await expect(requireOrgContext()).rejects.toThrow(UnauthorizedError)
  })

  it('deve lançar UnauthorizedError quando orgId está ausente no JWT', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce(mockSession({ orgId: undefined as any }) as any)

    await expect(requireOrgContext()).rejects.toThrow(UnauthorizedError)
  })

  it('deve lançar UnauthorizedError quando orgId é string vazia', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce(mockSession({ orgId: '' }) as any)

    await expect(requireOrgContext()).rejects.toThrow(UnauthorizedError)
  })

  it('deve retornar role correto para usuário associado', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce(mockSession({ role: 'associado' }) as any)

    const ctx = await requireOrgContext()
    expect(ctx.role).toBe('associado')
  })

  it('deve retornar role correto para estagiario', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce(mockSession({ role: 'estagiario' }) as any)

    const ctx = await requireOrgContext()
    expect(ctx.role).toBe('estagiario')
  })
})

describe('requireRole', () => {
  const makeCtx = (role: OrgContext['role']): OrgContext => ({
    orgId: 'org-uuid-1',
    userId: 'user-uuid-1',
    role,
  })

  describe('papel mínimo: estagiario', () => {
    it('socio passa sem erro', () => {
      expect(() => requireRole(makeCtx('socio'), 'estagiario')).not.toThrow()
    })

    it('associado passa sem erro', () => {
      expect(() => requireRole(makeCtx('associado'), 'estagiario')).not.toThrow()
    })

    it('estagiario passa sem erro', () => {
      expect(() => requireRole(makeCtx('estagiario'), 'estagiario')).not.toThrow()
    })
  })

  describe('papel mínimo: associado', () => {
    it('socio passa sem erro', () => {
      expect(() => requireRole(makeCtx('socio'), 'associado')).not.toThrow()
    })

    it('associado passa sem erro', () => {
      expect(() => requireRole(makeCtx('associado'), 'associado')).not.toThrow()
    })

    it('estagiario lança ForbiddenError', () => {
      expect(() => requireRole(makeCtx('estagiario'), 'associado')).toThrow(ForbiddenError)
    })
  })

  describe('papel mínimo: socio', () => {
    it('socio passa sem erro', () => {
      expect(() => requireRole(makeCtx('socio'), 'socio')).not.toThrow()
    })

    it('associado lança ForbiddenError', () => {
      expect(() => requireRole(makeCtx('associado'), 'socio')).toThrow(ForbiddenError)
    })

    it('estagiario lança ForbiddenError', () => {
      expect(() => requireRole(makeCtx('estagiario'), 'socio')).toThrow(ForbiddenError)
    })
  })

  it('requireRole(ctx, "socio") com ctx.role = "estagiario" lança ForbiddenError', () => {
    const ctx = makeCtx('estagiario')
    expect(() => requireRole(ctx, 'socio')).toThrow(ForbiddenError)
  })

  it('requireRole(ctx, "estagiario") com qualquer papel retorna sem erro', () => {
    expect(() => requireRole(makeCtx('socio'), 'estagiario')).not.toThrow()
    expect(() => requireRole(makeCtx('associado'), 'estagiario')).not.toThrow()
    expect(() => requireRole(makeCtx('estagiario'), 'estagiario')).not.toThrow()
  })
})
