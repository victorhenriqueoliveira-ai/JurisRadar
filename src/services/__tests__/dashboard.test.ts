/**
 * Testes unitários para src/services/dashboard.ts
 *
 * Cobre:
 * - aggregateDashboard: retorna zeros para org sem processos
 * - aggregateDashboard: escopo 'escritorio' exige papel 'socio'
 * - aggregateDashboard: escopo 'pessoal' não exige papel superior
 * - getPrazosUrgentes: retorna lista corretamente
 * - getMovimentacoesRecentes: retorna lista corretamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/errors', () => {
  class ForbiddenError extends Error {
    readonly status = 403
    constructor(message = 'Acesso negado') {
      super(message)
      this.name = 'ForbiddenError'
    }
  }
  class UnauthorizedError extends Error {
    readonly status = 401
    constructor(message = 'Não autenticado') {
      super(message)
      this.name = 'UnauthorizedError'
    }
  }
  class NotFoundError extends Error {
    readonly status = 404
    constructor(message = 'Não encontrado') {
      super(message)
      this.name = 'NotFoundError'
    }
  }
  return { ForbiddenError, UnauthorizedError, NotFoundError }
})

vi.mock('@/lib/org-context', () => {
  const ROLE_HIERARCHY = ['estagiario', 'associado', 'socio']
  class ForbiddenError extends Error {
    readonly status = 403
    constructor(message = 'Acesso negado') {
      super(message)
      this.name = 'ForbiddenError'
    }
  }
  return {
    requireOrgContext: vi.fn(),
    requireRole: vi.fn((ctx: { role: string }, minimum: string) => {
      const userIdx = ROLE_HIERARCHY.indexOf(ctx.role)
      const minIdx = ROLE_HIERARCHY.indexOf(minimum)
      if (userIdx < minIdx) {
        throw new ForbiddenError(
          `Papel insuficiente: requerido '${minimum}', usuário tem '${ctx.role}'`,
        )
      }
    }),
    ForbiddenError,
    UnauthorizedError: class UnauthorizedError extends Error {
      readonly status = 401
      constructor(msg = '') {
        super(msg)
        this.name = 'UnauthorizedError'
      }
    },
  }
})

// Mock do DB usando vi.hoisted para evitar "Cannot access before initialization"
const { mockSelect, mockSelectDistinct } = vi.hoisted(() => {
  // Builders encadeáveis mínimos para Drizzle
  function makeZeroCountBuilder() {
    const b: Record<string, unknown> = {}
    b.from = () => ({
      where: () => Promise.resolve([{ count: 0 }]),
      innerJoin: () => ({
        where: () => Promise.resolve([{ count: 0 }]),
      }),
    })
    return b
  }

  function makeEmptyArrBuilder() {
    const b: Record<string, unknown> = {}
    b.from = () => ({
      innerJoin: () => ({
        where: () => Promise.resolve([]),
      }),
    })
    return b
  }

  const mockSelect = vi.fn(() => makeZeroCountBuilder())
  const mockSelectDistinct = vi.fn(() => makeEmptyArrBuilder())

  return { mockSelect, mockSelectDistinct }
})

vi.mock('@/db', () => ({
  db: {
    select: mockSelect,
    selectDistinct: mockSelectDistinct,
  },
}))

vi.mock('@/db/schema', () => ({
  processos: {},
  movimentacoes: {},
  notificacoes: {},
  eventosCalendario: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn((...args: unknown[]) => args.filter(Boolean)),
  isNull: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  sql: new Proxy(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ sql: String(strings), values })),
    {
      get(target, prop) {
        if (prop === 'raw') return vi.fn(() => ({}))
        return (target as Record<string, unknown>)[prop as string]
      },
    },
  ),
  gte: vi.fn(() => ({})),
  lt: vi.fn(() => ({})),
  lte: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
}))

// Importar após os mocks
import { aggregateDashboard, getPrazosUrgentes, getMovimentacoesRecentes } from '../dashboard'
import type { OrgContext } from '@/types/domain'

// ── Contextos de teste ─────────────────────────────────────────────────────────

const ctxSocio: OrgContext = { orgId: 'org-A', userId: 'user-1', role: 'socio' }
const ctxAssociado: OrgContext = { orgId: 'org-A', userId: 'user-2', role: 'associado' }
const ctxEstagiario: OrgContext = { orgId: 'org-A', userId: 'user-3', role: 'estagiario' }

// ── Setup padrão — DB vazio ────────────────────────────────────────────────────

function setupEmptyDb() {
  mockSelect.mockImplementation(() => ({
    from: () => ({
      where: (cond: unknown) => ({
        // Supports groupBy (for distribuicao queries)
        groupBy: () => Promise.resolve([]),
        // Supports innerJoin for evolucao mensal queries
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
        // Direct await (resolves to count row)
        then: (resolve: (v: unknown) => void) => resolve([{ count: 0 }]),
      }),
      innerJoin: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    }),
  }))

  mockSelectDistinct.mockImplementation(() => ({
    from: () => ({
      innerJoin: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
  }))
}

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('aggregateDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupEmptyDb()
  })

  it('retorna zeros para org sem processos (scope pessoal)', async () => {
    const result = await aggregateDashboard(ctxSocio, 'pessoal')

    expect(result.totalAtivos).toBe(0)
    expect(result.urgenciaAlta).toBe(0)
    expect(result.prazos7Dias).toBe(0)
    expect(result.intimacoesNaoLidas).toBe(0)
    expect(result.distribuicaoStatus).toEqual([])
    expect(result.distribuicaoArea).toEqual([])
  })

  it('retorna totalAtivos, urgenciaAlta, prazos7Dias, intimacoesNaoLidas como numbers', async () => {
    const result = await aggregateDashboard(ctxSocio, 'pessoal')

    expect(typeof result.totalAtivos).toBe('number')
    expect(typeof result.urgenciaAlta).toBe('number')
    expect(typeof result.prazos7Dias).toBe('number')
    expect(typeof result.intimacoesNaoLidas).toBe('number')
  })

  it('evolucaoMensal contém 6 meses com campos mes, novos, encerrados', async () => {
    const result = await aggregateDashboard(ctxSocio, 'pessoal')

    expect(result.evolucaoMensal).toHaveLength(6)
    for (const mes of result.evolucaoMensal) {
      expect(mes).toHaveProperty('mes')
      expect(mes).toHaveProperty('novos')
      expect(mes).toHaveProperty('encerrados')
      expect(typeof mes.novos).toBe('number')
      expect(typeof mes.encerrados).toBe('number')
      expect(mes.mes).toMatch(/^\d{4}-\d{2}$/)
    }
  })

  it('scope=escritorio com papel socio executa sem lançar erro', async () => {
    await expect(aggregateDashboard(ctxSocio, 'escritorio')).resolves.toBeDefined()
  })

  it('scope=escritorio com papel associado lança ForbiddenError (status 403)', async () => {
    await expect(aggregateDashboard(ctxAssociado, 'escritorio')).rejects.toMatchObject({
      status: 403,
    })
  })

  it('scope=escritorio com papel estagiario lança ForbiddenError (status 403)', async () => {
    await expect(aggregateDashboard(ctxEstagiario, 'escritorio')).rejects.toMatchObject({
      status: 403,
    })
  })

  it('scope=pessoal com papel estagiario executa sem lançar ForbiddenError', async () => {
    await expect(aggregateDashboard(ctxEstagiario, 'pessoal')).resolves.toBeDefined()
  })

  it('scope=escritorio com papel associado inclui mensagem de erro descritiva', async () => {
    try {
      await aggregateDashboard(ctxAssociado, 'escritorio')
      expect.fail('Deveria ter lançado ForbiddenError')
    } catch (err) {
      expect((err as Error).message).toContain('sócio')
    }
  })
})

describe('getPrazosUrgentes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna array vazio quando não há prazos', async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    }))

    const result = await getPrazosUrgentes(ctxSocio)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })

  it('retorna prazos com processoId, numeroCnj, tribunal, prazoAt e diasRestantes', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    mockSelect.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    processoId: 'proc-1',
                    numeroCnj: '1234567-89.2024.8.26.0001',
                    tribunal: 'TJSP',
                    prazoAt: futureDateStr,
                  },
                ]),
            }),
          }),
        }),
      }),
    }))

    const result = await getPrazosUrgentes(ctxSocio)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      processoId: 'proc-1',
      numeroCnj: '1234567-89.2024.8.26.0001',
      tribunal: 'TJSP',
      prazoAt: futureDateStr,
    })
    expect(typeof result[0].diasRestantes).toBe('number')
  })

  it('calcula diasRestantes positivo para datas futuras', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    mockSelect.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    processoId: 'proc-2',
                    numeroCnj: '9876543-21.2024.8.26.0002',
                    tribunal: null,
                    prazoAt: futureDateStr,
                  },
                ]),
            }),
          }),
        }),
      }),
    }))

    const result = await getPrazosUrgentes(ctxSocio)
    expect(result[0].diasRestantes).toBeGreaterThan(0)
  })
})

describe('getMovimentacoesRecentes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna array vazio quando não há movimentações', async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    }))

    const result = await getMovimentacoesRecentes(ctxSocio)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })

  it('retorna movimentações com dataHora como ISO string', async () => {
    const dataHora = new Date('2026-01-15T10:30:00Z')

    mockSelect.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    processoId: 'proc-1',
                    numeroCnj: '1234567-89.2024.8.26.0001',
                    tipo: 'decisão',
                    descricao: 'Decisão interlocutória proferida',
                    dataHora,
                  },
                ]),
            }),
          }),
        }),
      }),
    }))

    const result = await getMovimentacoesRecentes(ctxSocio)
    expect(result).toHaveLength(1)
    expect(result[0].processoId).toBe('proc-1')
    expect(result[0].dataHora).toBe(dataHora.toISOString())
    expect(result[0].descricao).toBe('Decisão interlocutória proferida')
  })

  it('retorna at most 10 movimentações', async () => {
    const dataHora = new Date()
    const rows = Array.from({ length: 10 }, (_, i) => ({
      processoId: `proc-${i}`,
      numeroCnj: `00000${i}-00.2026.8.26.0000`,
      tipo: null,
      descricao: `Movimentação ${i}`,
      dataHora,
    }))

    mockSelect.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve(rows),
            }),
          }),
        }),
      }),
    }))

    const result = await getMovimentacoesRecentes(ctxSocio)
    expect(result.length).toBeLessThanOrEqual(10)
  })
})
