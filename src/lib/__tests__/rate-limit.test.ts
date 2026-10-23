/**
 * Testes unitários para src/lib/rate-limit.ts
 *
 * Cobre:
 * - extrairIp: leitura de x-forwarded-for / x-real-ip / fallback
 * - checarRateLimitCadastro: registra tentativa e bloqueia acima do limite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbInsert = vi.fn()
const mockDbSelect = vi.fn()

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockDbInsert(...args),
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  registroTentativas: { id: 'id', ip: 'ip', createdAt: 'created_at' },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
  gte: vi.fn((field, value) => ({ type: 'gte', field, value })),
  count: vi.fn(() => ({ type: 'count' })),
}))

import { extrairIp, checarRateLimitCadastro } from '@/lib/rate-limit'

function mockCountResult(total: number) {
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ total }]),
  })
}

describe('extrairIp', () => {
  it('lê o primeiro IP de x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })
    expect(extrairIp(headers)).toBe('203.0.113.5')
  })

  it('usa x-real-ip quando x-forwarded-for está ausente', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.9' })
    expect(extrairIp(headers)).toBe('198.51.100.9')
  })

  it('retorna "unknown" quando nenhum header está presente', () => {
    const headers = new Headers()
    expect(extrairIp(headers)).toBe('unknown')
  })
})

describe('checarRateLimitCadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDbInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
  })

  it('registra a tentativa e retorna false (não bloqueado) quando abaixo do limite', async () => {
    mockCountResult(3)

    const bloqueado = await checarRateLimitCadastro('203.0.113.5')

    expect(mockDbInsert).toHaveBeenCalled()
    expect(bloqueado).toBe(false)
  })

  it('retorna true (bloqueado) quando o total excede o limite', async () => {
    mockCountResult(6)

    const bloqueado = await checarRateLimitCadastro('203.0.113.5')

    expect(bloqueado).toBe(true)
  })

  it('não bloqueia quando o total é igual ao limite', async () => {
    mockCountResult(5)

    const bloqueado = await checarRateLimitCadastro('203.0.113.5')

    expect(bloqueado).toBe(false)
  })
})
