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
  saques: {
    id: 'id',
    orgId: 'org_id',
    solicitadoPorId: 'solicitado_por_id',
    asaasTransferId: 'asaas_transfer_id',
    valor: 'valor',
    taxaTransferencia: 'taxa_transferencia',
    valorLiquido: 'valor_liquido',
    pixAddressKey: 'pix_address_key',
    pixAddressKeyType: 'pix_address_key_type',
    status: 'status',
    failReason: 'fail_reason',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    $inferSelect: {},
  },
}))

vi.mock('@/lib/asaas/client', () => ({
  consultarSaldo: vi.fn(),
  criarTransferenciaPix: vi.fn(),
}))

vi.mock('@/lib/asaas/errors', () => {
  class AsaasErrorMock extends Error {
    code: string
    httpStatus?: number
    constructor(message: string, code = 'UNKNOWN', httpStatus?: number) {
      super(message)
      this.name = 'AsaasError'
      this.code = code
      this.httpStatus = httpStatus
    }
  }
  return { AsaasError: AsaasErrorMock }
})

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
  desc: vi.fn((field) => ({ type: 'desc', field })),
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

// ── consultarSaldoOrg ──────────────────────────────────────────────────────────

describe('consultarSaldoOrg', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retorna o saldo retornado pelo client Asaas', async () => {
    const { consultarSaldo } = await import('@/lib/asaas/client')
    vi.mocked(consultarSaldo).mockResolvedValue(5210.96)

    const { consultarSaldoOrg } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    const saldo = await consultarSaldoOrg(ctx)

    expect(saldo).toBe(5210.96)
    expect(consultarSaldo).toHaveBeenCalledWith('org-a')
  })

  it('propaga AsaasError (ex: NOT_FOUND) lançado pelo client', async () => {
    const { consultarSaldo } = await import('@/lib/asaas/client')
    const { AsaasError } = await import('@/lib/asaas/errors')
    vi.mocked(consultarSaldo).mockRejectedValue(new AsaasError('Sem sub-conta', 'NOT_FOUND', 404))

    const { consultarSaldoOrg } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(consultarSaldoOrg(ctx)).rejects.toMatchObject({ name: 'AsaasError', code: 'NOT_FOUND' })
  })
})

// ── solicitarSaque ─────────────────────────────────────────────────────────────

describe('solicitarSaque', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { requireRole } = await import('@/lib/org-context')
    vi.mocked(requireRole).mockImplementation(() => {})
  })

  it('lança ForbiddenError quando o usuário não é sócio', async () => {
    const { requireRole, ForbiddenError } = await import('@/lib/org-context')
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ForbiddenError('Apenas sócios podem solicitar saques')
    })

    const { solicitarSaque } = await import('@/services/financeiro')
    const ctx = makeCtx({ role: 'associado' })

    await expect(
      solicitarSaque(ctx, { valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }),
    ).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('lança ValidationError quando valor <= 0', async () => {
    const { solicitarSaque } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(
      solicitarSaque(ctx, { valor: 0, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }),
    ).rejects.toMatchObject({ name: 'ValidationError' })
  })

  it('lança ValidationError quando pixAddressKey está vazia', async () => {
    const { solicitarSaque } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(
      solicitarSaque(ctx, { valor: 100, pixAddressKey: '  ', pixAddressKeyType: 'EMAIL' }),
    ).rejects.toMatchObject({ name: 'ValidationError' })
  })

  it('lança ValidationError quando valor excede o saldo disponível', async () => {
    const { consultarSaldo } = await import('@/lib/asaas/client')
    vi.mocked(consultarSaldo).mockResolvedValue(50)

    const { solicitarSaque } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await expect(
      solicitarSaque(ctx, { valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }),
    ).rejects.toMatchObject({ name: 'ValidationError' })
  })

  it('cria o saque, chama a transferência Pix e atualiza o registro com os dados retornados', async () => {
    const { db } = await import('@/db')
    const { consultarSaldo, criarTransferenciaPix } = await import('@/lib/asaas/client')

    vi.mocked(consultarSaldo).mockResolvedValue(1000)

    const saqueInicial = {
      id: 'saque-1',
      orgId: 'org-a',
      valor: '100',
      pixAddressKey: 'chave',
      pixAddressKeyType: 'EMAIL',
      status: 'pending',
    }
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([saqueInicial]),
    }
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>)

    vi.mocked(criarTransferenciaPix).mockResolvedValue({
      asaasTransferId: 'transfer-abc',
      status: 'PENDING',
      valor: 100,
      taxaTransferencia: 1.5,
      valorLiquido: 98.5,
    })

    const saqueAtualizado = { ...saqueInicial, status: 'pending', asaasTransferId: 'transfer-abc' }
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([saqueAtualizado]),
    }
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>)

    const { solicitarSaque } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    const result = await solicitarSaque(ctx, { valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' })

    expect(criarTransferenciaPix).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-a', valor: 100, externalReference: 'saque-1' }),
    )
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ asaasTransferId: 'transfer-abc', status: 'pending' }),
    )
    expect(result).toEqual(saqueAtualizado)
  })

  it('marca o saque como failed quando a transferência Pix falha', async () => {
    const { db } = await import('@/db')
    const { consultarSaldo, criarTransferenciaPix } = await import('@/lib/asaas/client')
    const { AsaasError } = await import('@/lib/asaas/errors')

    vi.mocked(consultarSaldo).mockResolvedValue(1000)

    const saqueInicial = { id: 'saque-2', orgId: 'org-a', valor: '100', status: 'pending' }
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([saqueInicial]),
    }
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>)

    vi.mocked(criarTransferenciaPix).mockRejectedValue(new AsaasError('Saldo insuficiente', 'BAD_REQUEST', 400))

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>)

    const { solicitarSaque } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    await expect(
      solicitarSaque(ctx, { valor: 100, pixAddressKey: 'chave', pixAddressKeyType: 'EMAIL' }),
    ).rejects.toMatchObject({ name: 'AsaasError' })

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', failReason: 'Saldo insuficiente' }),
    )
  })
})

// ── listarSaques ───────────────────────────────────────────────────────────────

describe('listarSaques', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retorna os saques do escritório ordenados do mais recente ao mais antigo', async () => {
    const { db } = await import('@/db')

    const mockRows = [
      { id: 'saque-2', orgId: 'org-a', createdAt: '2026-10-20' },
      { id: 'saque-1', orgId: 'org-a', createdAt: '2026-10-10' },
    ]
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockRows),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { listarSaques } = await import('@/services/financeiro')
    const ctx = makeCtx({ orgId: 'org-a' })

    const result = await listarSaques(ctx)

    expect(result).toEqual(mockRows)
    expect(selectChain.limit).toHaveBeenCalledWith(20)
  })

  it('limita o limit informado a no máximo 100', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { listarSaques } = await import('@/services/financeiro')
    const ctx = makeCtx()

    await listarSaques(ctx, 500)

    expect(selectChain.limit).toHaveBeenCalledWith(100)
  })
})
