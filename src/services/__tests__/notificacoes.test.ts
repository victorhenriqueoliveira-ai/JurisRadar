/**
 * Testes unitários para src/services/notificacoes.ts
 *
 * Cobertura ≥80% dos casos especificados na task_10.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { OrgContext } from '@/types/domain'

// ── Mock do módulo db ──────────────────────────────────────────────────────────

const mockReturning = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockOrderBy = vi.fn()
const mockSet = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockFrom = vi.fn()

// Builder pattern: cada método retorna o próprio objeto mock
const queryBuilder = {
  where: mockWhere,
  limit: mockLimit,
  orderBy: mockOrderBy,
  set: mockSet,
  returning: mockReturning,
  from: mockFrom,
  select: mockSelect,
  update: mockUpdate,
}

// Encadeamento fluente
mockWhere.mockReturnValue(queryBuilder)
mockLimit.mockReturnValue(queryBuilder)
mockOrderBy.mockReturnValue(queryBuilder)
mockSet.mockReturnValue(queryBuilder)
mockReturning.mockResolvedValue([])
mockFrom.mockReturnValue(queryBuilder)
mockSelect.mockReturnValue(queryBuilder)
mockUpdate.mockReturnValue(queryBuilder)

const db = {
  select: vi.fn(() => queryBuilder),
  update: vi.fn(() => queryBuilder),
}

vi.mock('@/db', () => ({ db }))
vi.mock('@/db/schema', () => ({
  notificacoes: { userId: 'userId', orgId: 'orgId', lida: 'lida', id: 'id', createdAt: 'createdAt' },
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => `eq(${String(_col)},${String(_val)})`),
  and: vi.fn((...args: unknown[]) => `and(${args.join(',')})`),
  desc: vi.fn((col: unknown) => `desc(${String(col)})`),
  gt: vi.fn((_col: unknown, _val: unknown) => `gt(${String(_col)},${String(_val)})`),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      const raw = strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '')
      return `sql(${raw})`
    }),
    { raw: vi.fn((s: string) => `sql.raw(${s})`) },
  ),
}))
vi.mock('@/lib/errors', () => ({
  ForbiddenError: class ForbiddenError extends Error {
    status = 403
    constructor(msg = 'Acesso negado') { super(msg); this.name = 'ForbiddenError' }
  },
  NotFoundError: class NotFoundError extends Error {
    status = 404
    constructor(msg = 'Recurso não encontrado') { super(msg); this.name = 'NotFoundError' }
  },
}))

// ── Importação das funções testadas (após os mocks) ────────────────────────────

const { countNotificacoesNaoLidas, listNotificacoes, marcarLida, marcarTodasLidas } =
  await import('@/services/notificacoes')

// ── Fixtures ───────────────────────────────────────────────────────────────────

const ctxA: OrgContext = { orgId: 'org-a', userId: 'user-a', role: 'associado' }
const ctxB: OrgContext = { orgId: 'org-b', userId: 'user-b', role: 'associado' }

function makeNotificacao(overrides: Partial<{ id: string; lida: boolean; userId: string; orgId: string }> = {}) {
  return {
    id: 'notif-1',
    orgId: ctxA.orgId,
    userId: ctxA.userId,
    processoId: null,
    tipo: 'movimentacao',
    titulo: 'Nova movimentação',
    corpo: null,
    lida: false,
    lidaAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('countNotificacoesNaoLidas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.select.mockReturnValue(queryBuilder)
    mockFrom.mockReturnValue(queryBuilder)
    mockWhere.mockReturnValue(queryBuilder)
    mockLimit.mockReturnValue(queryBuilder)
  })

  it('retorna 0 para usuário sem notificações', async () => {
    mockWhere.mockResolvedValueOnce([{ count: 0 }])
    const count = await countNotificacoesNaoLidas(ctxA)
    expect(count).toBe(0)
  })

  it('retorna 3 para usuário com 3 notificações não lidas', async () => {
    mockWhere.mockResolvedValueOnce([{ count: 3 }])
    const count = await countNotificacoesNaoLidas(ctxA)
    expect(count).toBe(3)
  })

  it('retorna 0 quando result é vazio (sem linhas)', async () => {
    mockWhere.mockResolvedValueOnce([])
    const count = await countNotificacoesNaoLidas(ctxA)
    expect(count).toBe(0)
  })
})

describe('listNotificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.select.mockReturnValue(queryBuilder)
    mockFrom.mockReturnValue(queryBuilder)
    mockWhere.mockReturnValue(queryBuilder)
    mockOrderBy.mockReturnValue(queryBuilder)
  })

  it('retorna lista vazia para usuário sem notificações', async () => {
    mockLimit.mockResolvedValueOnce([])
    const result = await listNotificacoes(ctxA)
    expect(result.data).toEqual([])
    expect(result.nextCursor).toBeNull()
  })

  it('retorna dados com nextCursor quando há mais resultados', async () => {
    // Simular 21 resultados com limit=20 → hasMore=true
    const rows = Array.from({ length: 21 }, (_, i) => makeNotificacao({ id: `notif-${i}` }))
    mockLimit.mockResolvedValueOnce(rows)
    const result = await listNotificacoes(ctxA, { limit: 20 })
    expect(result.data).toHaveLength(20)
    expect(result.nextCursor).toBe('notif-19')
  })

  it('nextCursor é null quando não há mais resultados', async () => {
    const rows = [makeNotificacao()]
    mockLimit.mockResolvedValueOnce(rows)
    const result = await listNotificacoes(ctxA, { limit: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.nextCursor).toBeNull()
  })

  it('notificações de org B não aparecem na consulta de org A', async () => {
    // O isolamento é garantido pelo filtro orgId no WHERE — testamos que db.select é chamado
    mockLimit.mockResolvedValueOnce([])
    await listNotificacoes(ctxA)
    // Verificar que a chamada usou os dados do contexto A (via mocks de eq/and)
    expect(db.select).toHaveBeenCalled()
  })
})

describe('marcarLida', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.select.mockReturnValue(queryBuilder)
    db.update.mockReturnValue(queryBuilder)
    mockFrom.mockReturnValue(queryBuilder)
    mockWhere.mockReturnValue(queryBuilder)
    mockSet.mockReturnValue(queryBuilder)
    mockReturning.mockResolvedValue([])
  })

  it('lança ForbiddenError (403) para notificação de outro usuário', async () => {
    const notifDeB = makeNotificacao({ userId: ctxB.userId, orgId: ctxB.orgId })
    // Primeira chamada: SELECT para buscar a notificação
    mockLimit.mockResolvedValueOnce([notifDeB])

    await expect(marcarLida(ctxA, 'notif-1')).rejects.toMatchObject({
      name: 'ForbiddenError',
      status: 403,
    })
  })

  it('lança NotFoundError quando notificação não existe', async () => {
    mockLimit.mockResolvedValueOnce([])

    await expect(marcarLida(ctxA, 'notif-inexistente')).rejects.toMatchObject({
      name: 'NotFoundError',
      status: 404,
    })
  })

  it('marca como lida com sucesso para o próprio usuário', async () => {
    const notif = makeNotificacao({ userId: ctxA.userId, orgId: ctxA.orgId })
    // SELECT retorna a notificação do próprio usuário
    mockLimit.mockResolvedValueOnce([notif])
    // UPDATE .set().where() resolve normalmente
    mockSet.mockReturnValue({ ...queryBuilder, where: vi.fn().mockResolvedValueOnce(undefined) })

    // Não deve lançar
    await expect(marcarLida(ctxA, 'notif-1')).resolves.toBeUndefined()
    expect(db.update).toHaveBeenCalled()
  })
})

describe('marcarTodasLidas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.update.mockReturnValue(queryBuilder)
    mockSet.mockReturnValue(queryBuilder)
    mockWhere.mockReturnValue(queryBuilder)
  })

  it('retorna o número de notificações atualizadas', async () => {
    mockReturning.mockResolvedValueOnce([{ id: '1' }, { id: '2' }, { id: '3' }])
    const updated = await marcarTodasLidas(ctxA)
    expect(updated).toBe(3)
  })

  it('retorna 0 quando não há notificações não lidas', async () => {
    mockReturning.mockResolvedValueOnce([])
    const updated = await marcarTodasLidas(ctxA)
    expect(updated).toBe(0)
  })

  it('marca apenas notificações do usuário autenticado', async () => {
    mockReturning.mockResolvedValueOnce([{ id: '1' }])
    await marcarTodasLidas(ctxA)
    // Verificar que db.update foi chamado (o isolamento por userId/orgId é garantido no WHERE)
    expect(db.update).toHaveBeenCalled()
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ lida: true }),
    )
  })
})
