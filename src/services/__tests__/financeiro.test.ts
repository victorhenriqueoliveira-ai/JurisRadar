/**
 * Testes unitários para src/services/financeiro.ts
 *
 * Cobre:
 * - calcularStatusPagamento (função pura)
 * - createOrUpdateHonorario (validação, isolamento multi-tenant)
 * - addPagamento (validação, isolamento, recálculo de status)
 * - removePagamento (isolamento 403, recálculo de status)
 * - getDashboardFinanceiro (totais)
 * - listHonorarios (filtros, paginação)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/org-context', () => {
  class ForbiddenErrorMock extends Error {
    readonly status = 403
    constructor(message = 'Acesso negado') {
      super(message)
      this.name = 'ForbiddenError'
    }
  }

  class UnauthorizedErrorMock extends Error {
    readonly status = 401
    constructor(message = 'Não autenticado') {
      super(message)
      this.name = 'UnauthorizedError'
    }
  }

  return {
    requireOrgContext: vi.fn(),
    requireRole: vi.fn(),
    ForbiddenError: ForbiddenErrorMock,
    UnauthorizedError: UnauthorizedErrorMock,
  }
})

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/db/schema', () => ({
  honorarios: {
    id: 'id',
    orgId: 'org_id',
    processoId: 'processo_id',
    tipo: 'tipo',
    valor: 'valor',
    dataPrevista: 'data_prevista',
    statusPagamento: 'status_pagamento',
    $inferSelect: {},
  },
  pagamentos: {
    id: 'id',
    orgId: 'org_id',
    honorarioId: 'honorario_id',
    valor: 'valor',
    pagoEm: 'pago_em',
    observacao: 'observacao',
    $inferSelect: {},
  },
  processos: {
    id: 'id',
    orgId: 'org_id',
    $inferSelect: {},
  },
}))

vi.mock('@/lib/errors', () => {
  class ValidationErrorMock extends Error {
    readonly status = 400
    constructor(message = 'Dados inválidos') {
      super(message)
      this.name = 'ValidationError'
    }
  }

  class NotFoundErrorMock extends Error {
    readonly status = 404
    constructor(message = 'Não encontrado') {
      super(message)
      this.name = 'NotFoundError'
    }
  }

  class ForbiddenErrorMock extends Error {
    readonly status = 403
    constructor(message = 'Acesso negado') {
      super(message)
      this.name = 'ForbiddenError'
    }
  }

  class UnauthorizedErrorMock extends Error {
    readonly status = 401
    constructor(message = 'Não autenticado') {
      super(message)
      this.name = 'UnauthorizedError'
    }
  }

  return {
    ValidationError: ValidationErrorMock,
    NotFoundError: NotFoundErrorMock,
    ForbiddenError: ForbiddenErrorMock,
    UnauthorizedError: UnauthorizedErrorMock,
  }
})

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, val) => ({ type: 'eq', field, val })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  gte: vi.fn((field, val) => ({ type: 'gte', field, val })),
  lte: vi.fn((field, val) => ({ type: 'lte', field, val })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      type: 'sql',
      strings,
      values,
    })),
    { raw: vi.fn((s: string) => ({ type: 'sql_raw', s })) },
  ),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCtx(
  overrides: Partial<{ orgId: string; userId: string; role: 'socio' | 'associado' | 'estagiario' }> = {},
) {
  return {
    orgId: 'org-a',
    userId: 'user-1',
    role: 'socio' as const,
    ...overrides,
  }
}

// ── calcularStatusPagamento ────────────────────────────────────────────────────

describe('calcularStatusPagamento', () => {
  it('retorna "pendente" quando não há pagamentos', async () => {
    const { calcularStatusPagamento } = await import('@/services/financeiro')
    expect(calcularStatusPagamento(1000, [])).toBe('pendente')
  })

  it('retorna "parcial" quando soma dos pagamentos < valorTotal', async () => {
    const { calcularStatusPagamento } = await import('@/services/financeiro')
    expect(calcularStatusPagamento(1000, [{ valor: 500 }])).toBe('parcial')
  })

  it('retorna "quitado" quando soma dos pagamentos === valorTotal', async () => {
    const { calcularStatusPagamento } = await import('@/services/financeiro')
    expect(calcularStatusPagamento(1000, [{ valor: 1000 }])).toBe('quitado')
  })

  it('retorna "quitado" quando soma dos pagamentos > valorTotal', async () => {
    const { calcularStatusPagamento } = await import('@/services/financeiro')
    expect(calcularStatusPagamento(1000, [{ valor: 600 }, { valor: 500 }])).toBe('quitado')
  })

  it('retorna "parcial" com múltiplos pagamentos parciais', async () => {
    const { calcularStatusPagamento } = await import('@/services/financeiro')
    expect(calcularStatusPagamento(1000, [{ valor: 300 }, { valor: 200 }])).toBe('parcial')
  })

  it('aceita valor como string (compatível com numeric do Drizzle)', async () => {
    const { calcularStatusPagamento } = await import('@/services/financeiro')
    expect(calcularStatusPagamento(1000, [{ valor: '1000' }])).toBe('quitado')
    expect(calcularStatusPagamento(1000, [{ valor: '500' }])).toBe('parcial')
  })
})

// ── createOrUpdateHonorario ────────────────────────────────────────────────────

describe('createOrUpdateHonorario', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('lança ValidationError quando valor é negativo', async () => {
    const { createOrUpdateHonorario } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(
      createOrUpdateHonorario(ctx, { processoId: 'p1', tipo: 'Contratual', valor: -100 }),
    ).rejects.toMatchObject({ name: 'ValidationError' })
  })

  it('lança ValidationError quando processoId está ausente', async () => {
    const { createOrUpdateHonorario } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(
      createOrUpdateHonorario(ctx, { processoId: '', tipo: 'Contratual', valor: 1000 }),
    ).rejects.toMatchObject({ name: 'ValidationError' })
  })

  it('lança ValidationError quando tipo está ausente', async () => {
    const { createOrUpdateHonorario } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(
      createOrUpdateHonorario(ctx, { processoId: 'p1', tipo: '', valor: 1000 }),
    ).rejects.toMatchObject({ name: 'ValidationError' })
  })

  it('lança ForbiddenError quando processo pertence a outro escritório', async () => {
    const { db } = await import('@/db')

    const processoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'p1', orgId: 'org-b' }]),
    }
    vi.mocked(db.select).mockReturnValueOnce(processoChain as unknown as ReturnType<typeof db.select>)

    const { createOrUpdateHonorario } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    await expect(
      createOrUpdateHonorario(ctx, { processoId: 'p1', tipo: 'Contratual', valor: 1000 }),
    ).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('cria honorário com status_pagamento "pendente" quando não há pagamentos', async () => {
    const { db } = await import('@/db')

    // processo existe e pertence ao org
    const processoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'p1', orgId: 'org-a' }]),
    }
    // nenhum honorário existente
    const honorarioChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select)
      .mockReturnValueOnce(processoChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(honorarioChain as unknown as ReturnType<typeof db.select>)

    const novoHonorario = {
      id: 'h1',
      orgId: 'org-a',
      processoId: 'p1',
      tipo: 'Contratual',
      valor: '1000',
      statusPagamento: 'pendente',
    }
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([novoHonorario]),
    }
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>)

    const { createOrUpdateHonorario } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    const result = await createOrUpdateHonorario(ctx, { processoId: 'p1', tipo: 'Contratual', valor: 1000 })

    expect(result.statusPagamento).toBe('pendente')
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-a', processoId: 'p1', statusPagamento: 'pendente' }),
    )
  })

  it('atualiza honorário existente e recalcula status', async () => {
    const { db } = await import('@/db')

    // processo
    const processoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'p1', orgId: 'org-a' }]),
    }
    // honorário existente
    const existingHonorario = { id: 'h1', orgId: 'org-a', valor: '800', statusPagamento: 'parcial' }
    const honorarioChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([existingHonorario]),
    }
    // pagamentos existentes: 500
    const pagamentosChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ valor: '500' }]),
    }
    vi.mocked(db.select)
      .mockReturnValueOnce(processoChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(honorarioChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(pagamentosChain as unknown as ReturnType<typeof db.select>)

    const updatedHonorario = { ...existingHonorario, valor: '1000', statusPagamento: 'parcial' }
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedHonorario]),
    }
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>)

    const { createOrUpdateHonorario } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    const result = await createOrUpdateHonorario(ctx, { processoId: 'p1', tipo: 'Contratual', valor: 1000 })

    expect(db.update).toHaveBeenCalled()
    expect(result.valor).toBe('1000')
  })
})

// ── addPagamento ───────────────────────────────────────────────────────────────

describe('addPagamento', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('lança ValidationError quando valor <= 0', async () => {
    const { addPagamento } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(
      addPagamento(ctx, 'h1', { valor: 0, dataPagamento: '2024-01-15' }),
    ).rejects.toMatchObject({ name: 'ValidationError' })

    await expect(
      addPagamento(ctx, 'h1', { valor: -50, dataPagamento: '2024-01-15' }),
    ).rejects.toMatchObject({ name: 'ValidationError' })
  })

  it('lança ForbiddenError quando honorário pertence a outro escritório', async () => {
    const { db } = await import('@/db')

    const honorarioChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'h1', orgId: 'org-b', valor: '1000' }]),
    }
    vi.mocked(db.select).mockReturnValueOnce(honorarioChain as unknown as ReturnType<typeof db.select>)

    const { addPagamento } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    await expect(
      addPagamento(ctx, 'h1', { valor: 500, dataPagamento: '2024-01-15' }),
    ).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('insere pagamento e recalcula status para "quitado" quando valor igual ao honorário', async () => {
    const { db } = await import('@/db')

    const honorarioExistente = { id: 'h1', orgId: 'org-a', valor: '1000', statusPagamento: 'pendente' }
    const honorarioChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([honorarioExistente]),
    }
    vi.mocked(db.select).mockReturnValueOnce(honorarioChain as unknown as ReturnType<typeof db.select>)

    const novoPagamento = { id: 'pg1', orgId: 'org-a', honorarioId: 'h1', valor: '1000', pagoEm: '2024-01-15' }
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([novoPagamento]),
    }
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>)

    // Para recalcularStatus: buscar todos pagamentos
    const pagamentosChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ valor: '1000' }]),
    }
    vi.mocked(db.select).mockReturnValueOnce(pagamentosChain as unknown as ReturnType<typeof db.select>)

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>)

    const { addPagamento } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    const result = await addPagamento(ctx, 'h1', { valor: 1000, dataPagamento: '2024-01-15' })

    expect(result).toEqual(novoPagamento)
    expect(db.insert).toHaveBeenCalled()
    expect(db.update).toHaveBeenCalled()
    // Verificar que o status foi recalculado para 'quitado'
    expect(updateChain.set).toHaveBeenCalledWith({ statusPagamento: 'quitado' })
  })
})

// ── removePagamento ────────────────────────────────────────────────────────────

describe('removePagamento', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('lança ForbiddenError quando pagamento pertence a outro escritório', async () => {
    const { db } = await import('@/db')

    const pagamentoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'pg1', orgId: 'org-b', honorarioId: 'h1' }]),
    }
    vi.mocked(db.select).mockReturnValueOnce(pagamentoChain as unknown as ReturnType<typeof db.select>)

    const { removePagamento } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    await expect(removePagamento(ctx, 'pg1')).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('deleta pagamento e recalcula status do honorário', async () => {
    const { db } = await import('@/db')

    const pagamentoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'pg1', orgId: 'org-a', honorarioId: 'h1' }]),
    }
    vi.mocked(db.select).mockReturnValueOnce(pagamentoChain as unknown as ReturnType<typeof db.select>)

    const deleteChain = {
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.delete).mockReturnValue(deleteChain as unknown as ReturnType<typeof db.delete>)

    // buscar honorário para recalcular
    const honorarioChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'h1', orgId: 'org-a', valor: '1000', statusPagamento: 'quitado' }]),
    }
    vi.mocked(db.select).mockReturnValueOnce(honorarioChain as unknown as ReturnType<typeof db.select>)

    // buscar pagamentos restantes (nenhum)
    const pagamentosRestantesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValueOnce(pagamentosRestantesChain as unknown as ReturnType<typeof db.select>)

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>)

    const { removePagamento } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    await removePagamento(ctx, 'pg1')

    expect(db.delete).toHaveBeenCalled()
    expect(db.update).toHaveBeenCalled()
    // Status deve ser 'pendente' após remover todos os pagamentos
    expect(updateChain.set).toHaveBeenCalledWith({ statusPagamento: 'pendente' })
  })

  it('lança NotFoundError quando pagamento não existe', async () => {
    const { db } = await import('@/db')

    const pagamentoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValueOnce(pagamentoChain as unknown as ReturnType<typeof db.select>)

    const { removePagamento } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(removePagamento(ctx, 'pg-inexistente')).rejects.toMatchObject({ name: 'NotFoundError' })
  })
})

// ── listHonorarios ─────────────────────────────────────────────────────────────

describe('listHonorarios', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retorna lista de honorários com paginação', async () => {
    const { db } = await import('@/db')

    const mockRows = [
      { id: 'h1', orgId: 'org-a', statusPagamento: 'pendente', valor: '1000' },
      { id: 'h2', orgId: 'org-a', statusPagamento: 'quitado', valor: '500' },
    ]

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockRows),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { listHonorarios } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    const result = await listHonorarios(ctx)

    expect(result.data).toHaveLength(2)
    expect(result.nextCursor).toBeNull()
  })

  it('retorna nextCursor quando há mais itens que o limit', async () => {
    const { db } = await import('@/db')

    const mockRows = Array.from({ length: 21 }, (_, i) => ({
      id: `h${i + 1}`,
      orgId: 'org-a',
      statusPagamento: 'pendente',
      valor: '1000',
    }))

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockRows),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { listHonorarios } = await import('@/services/financeiro')
    const ctx = makeCtx()

    const result = await listHonorarios(ctx, { limit: 20 })

    expect(result.data).toHaveLength(20)
    expect(result.nextCursor).toBe('h20')
  })
})

// ── getDashboardFinanceiro ─────────────────────────────────────────────────────

describe('getDashboardFinanceiro', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retorna totalAReceber, totalRecebido e emAtraso para o período', async () => {
    const { db } = await import('@/db')

    const aReceberChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: '5000' }]),
    }
    const recebidoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: '3000' }]),
    }
    const emAtrasoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: '1500' }]),
    }

    vi.mocked(db.select)
      .mockReturnValueOnce(aReceberChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(recebidoChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(emAtrasoChain as unknown as ReturnType<typeof db.select>)

    const { getDashboardFinanceiro } = await import('@/services/financeiro')
    const ctx = makeCtx()

    const result = await getDashboardFinanceiro(ctx, { inicio: '2024-01', fim: '2024-01' })

    expect(result.totalAReceber).toBe(5000)
    expect(result.totalRecebido).toBe(3000)
    expect(result.emAtraso).toBe(1500)
    expect(result.periodo).toBeDefined()
  })

  it('retorna zeros quando não há dados', async () => {
    const { db } = await import('@/db')

    const emptyChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: '0' }]),
    }

    vi.mocked(db.select)
      .mockReturnValueOnce(emptyChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(emptyChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(emptyChain as unknown as ReturnType<typeof db.select>)

    const { getDashboardFinanceiro } = await import('@/services/financeiro')
    const ctx = makeCtx()

    const result = await getDashboardFinanceiro(ctx)

    expect(result.totalAReceber).toBe(0)
    expect(result.totalRecebido).toBe(0)
    expect(result.emAtraso).toBe(0)
  })
})
