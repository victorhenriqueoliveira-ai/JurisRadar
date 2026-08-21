/**
 * Testes unitários para src/services/processos.ts
 *
 * Cobre:
 * - Isolamento multi-tenant (org_id)
 * - Controle de acesso por papel (role)
 * - Soft delete de processos
 * - Notas internas (criar e deletar)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock @/auth to avoid next-auth/next/server resolution issues
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Mock org-context: requireRole is called by the service layer
vi.mock('@/lib/org-context', () => {
  const ROLE_HIERARCHY = ['estagiario', 'associado', 'socio']

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
    requireRole: vi.fn((ctx: { role: string }, minimum: string) => {
      const userIndex = ROLE_HIERARCHY.indexOf(ctx.role)
      const minimumIndex = ROLE_HIERARCHY.indexOf(minimum)
      if (userIndex < minimumIndex) {
        throw new ForbiddenErrorMock(
          `Papel insuficiente: requerido '${minimum}', usuário tem '${ctx.role}'`,
        )
      }
    }),
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
  processos: {
    id: 'id',
    orgId: 'org_id',
    status: 'status',
    arquivadoAt: 'arquivado_at',
    areaDireito: 'area_direito',
    tribunal: 'tribunal',
    responsavelId: 'responsavel_id',
    numeroCnj: 'numero_cnj',
    ultimaMovimentacao: 'ultima_movimentacao',
    createdAt: 'created_at',
    $inferSelect: {},
  },
  movimentacoes: { processoId: 'processo_id', data: 'data', $inferSelect: {} },
  honorarios: { processoId: 'processo_id', $inferSelect: {} },
  notasProcesso: {
    id: 'id',
    orgId: 'org_id',
    processoId: 'processo_id',
    userId: 'user_id',
    conteudo: 'conteudo',
    createdAt: 'created_at',
    $inferSelect: {},
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, val) => ({ type: 'eq', field, val })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  isNull: vi.fn((field) => ({ type: 'isNull', field })),
  desc: vi.fn((field) => ({ type: 'desc', field })),
  gt: vi.fn((field, val) => ({ type: 'gt', field, val })),
  ilike: vi.fn((field, val) => ({ type: 'ilike', field, val })),
  or: vi.fn((...args) => ({ type: 'or', args })),
  sql: Object.assign(
    vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({ type: 'sql' })),
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

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('listProcessos', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retorna apenas processos do org A com status ativo', async () => {
    const { db } = await import('@/db')

    const mockProcessos = [
      { id: 'p1', orgId: 'org-a', status: 'ativo', arquivadoAt: null },
      { id: 'p2', orgId: 'org-a', status: 'ativo', arquivadoAt: null },
    ]

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockProcessos),
    }
    const countChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    }

    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof db.select>)

    const { listProcessos } = await import('@/services/processos')
    const ctx = makeCtx({ orgId: 'org-a' })
    const result = await listProcessos(ctx, { status: 'ativo' })

    expect(result.data).toHaveLength(2)
    expect(result.data.every((p) => p.orgId === 'org-a')).toBe(true)
    expect(result.data.every((p) => p.status === 'ativo')).toBe(true)
  })

  it('retorna lista com nextCursor quando há mais itens que o limit', async () => {
    const { db } = await import('@/db')

    const mockProcessos = Array.from({ length: 21 }, (_, i) => ({
      id: `p${i + 1}`,
      orgId: 'org-a',
      status: 'ativo',
      arquivadoAt: null,
    }))

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockProcessos),
    }
    const countChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 25 }]),
    }
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof db.select>)

    const { listProcessos } = await import('@/services/processos')
    const ctx = makeCtx()
    const result = await listProcessos(ctx, { limit: 20 })

    expect(result.data).toHaveLength(20)
    expect(result.nextCursor).toBe('p20')
    expect(result.total).toBe(25)
  })
})

describe('archiveProcesso', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('seta arquivado_at sem deletar o registro', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'p1', orgId: 'org-a' }]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>)

    const { archiveProcesso } = await import('@/services/processos')
    const ctx = makeCtx()

    await archiveProcesso(ctx, 'p1')

    expect(db.update).toHaveBeenCalled()
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ arquivadoAt: expect.any(Date) }),
    )
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('lança ForbiddenError quando estagiário tenta arquivar', async () => {
    const { archiveProcesso } = await import('@/services/processos')
    const ctx = makeCtx({ role: 'estagiario' })

    await expect(archiveProcesso(ctx, 'p1')).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('lança ForbiddenError quando processo pertence a outro org', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'p1', orgId: 'org-b' }]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { archiveProcesso } = await import('@/services/processos')
    const ctx = makeCtx({ orgId: 'org-a' })

    await expect(archiveProcesso(ctx, 'p1')).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('lança NotFoundError quando processo não existe', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { archiveProcesso } = await import('@/services/processos')
    const ctx = makeCtx()

    await expect(archiveProcesso(ctx, 'p-nao-existe')).rejects.toMatchObject({ name: 'NotFoundError' })
  })
})

describe('deleteNota', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('lança ForbiddenError quando userId é diferente do autor e papel é associado', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: 'nota-1', orgId: 'org-a', userId: 'outro-user', processoId: 'p1' },
      ]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { deleteNota } = await import('@/services/processos')
    const ctx = makeCtx({ userId: 'user-1', role: 'associado' })

    await expect(deleteNota(ctx, 'nota-1')).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('lança ForbiddenError quando estagiário tenta deletar nota de outro autor', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: 'nota-1', orgId: 'org-a', userId: 'outro-user', processoId: 'p1' },
      ]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { deleteNota } = await import('@/services/processos')
    const ctx = makeCtx({ userId: 'user-1', role: 'estagiario' })

    await expect(deleteNota(ctx, 'nota-1')).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('sócio pode deletar nota de qualquer autor', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: 'nota-1', orgId: 'org-a', userId: 'outro-user', processoId: 'p1' },
      ]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const deleteChain = {
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.delete).mockReturnValue(deleteChain as unknown as ReturnType<typeof db.delete>)

    const { deleteNota } = await import('@/services/processos')
    const ctx = makeCtx({ userId: 'user-1', role: 'socio' })

    await expect(deleteNota(ctx, 'nota-1')).resolves.toBeUndefined()
    expect(db.delete).toHaveBeenCalled()
  })

  it('autor pode deletar sua própria nota', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: 'nota-1', orgId: 'org-a', userId: 'user-1', processoId: 'p1' },
      ]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const deleteChain = {
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.delete).mockReturnValue(deleteChain as unknown as ReturnType<typeof db.delete>)

    const { deleteNota } = await import('@/services/processos')
    const ctx = makeCtx({ userId: 'user-1', role: 'associado' })

    await expect(deleteNota(ctx, 'nota-1')).resolves.toBeUndefined()
    expect(db.delete).toHaveBeenCalled()
  })

  it('lança ForbiddenError quando nota pertence a outro org', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: 'nota-1', orgId: 'org-b', userId: 'user-1', processoId: 'p1' },
      ]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { deleteNota } = await import('@/services/processos')
    const ctx = makeCtx({ orgId: 'org-a' })

    await expect(deleteNota(ctx, 'nota-1')).rejects.toMatchObject({ name: 'ForbiddenError' })
  })
})

describe('getProcesso', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retorna null quando processo não existe', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { getProcesso } = await import('@/services/processos')
    const ctx = makeCtx()

    const result = await getProcesso(ctx, 'nao-existe')
    expect(result).toBeNull()
  })

  it('lança ForbiddenError quando processo pertence a outro org', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'p1', orgId: 'org-b', status: 'ativo' }]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const { getProcesso } = await import('@/services/processos')
    const ctx = makeCtx({ orgId: 'org-a' })

    await expect(getProcesso(ctx, 'p1')).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('retorna processo com movimentações, honorário e notas', async () => {
    const { db } = await import('@/db')

    const processo = { id: 'p1', orgId: 'org-a', status: 'ativo' }
    const mockMovs = [{ id: 'm1', processoId: 'p1' }]
    const mockHonorario = { id: 'h1', processoId: 'p1' }
    const mockNotas = [{ id: 'n1', processoId: 'p1' }]

    const processoChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([processo]),
    }
    const movsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockMovs),
    }
    const honorarioChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockHonorario]),
    }
    const notasChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockNotas),
    }

    vi.mocked(db.select)
      .mockReturnValueOnce(processoChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(movsChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(honorarioChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(notasChain as unknown as ReturnType<typeof db.select>)

    const { getProcesso } = await import('@/services/processos')
    const ctx = makeCtx({ orgId: 'org-a' })

    const result = await getProcesso(ctx, 'p1')

    expect(result).not.toBeNull()
    expect(result?.id).toBe('p1')
    expect(result?.movimentacoes).toEqual(mockMovs)
    expect(result?.honorario).toEqual(mockHonorario)
    expect(result?.notas).toEqual(mockNotas)
  })
})

describe('addNota', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('lança ForbiddenError quando estagiário tenta adicionar nota', async () => {
    const { addNota } = await import('@/services/processos')
    const ctx = makeCtx({ role: 'estagiario' })

    await expect(addNota(ctx, 'p1', 'nota aqui')).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('lança ValidationError quando conteúdo está vazio', async () => {
    const { addNota } = await import('@/services/processos')
    const ctx = makeCtx({ role: 'associado' })

    await expect(addNota(ctx, 'p1', '')).rejects.toMatchObject({ name: 'ValidationError' })
    await expect(addNota(ctx, 'p1', '   ')).rejects.toMatchObject({ name: 'ValidationError' })
  })

  it('insere nota com orgId e userId do contexto', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'p1', orgId: 'org-a' }]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const newNota = {
      id: 'nota-nova',
      orgId: 'org-a',
      processoId: 'p1',
      userId: 'user-1',
      conteudo: 'texto',
    }
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([newNota]),
    }
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>)

    const { addNota } = await import('@/services/processos')
    const ctx = makeCtx({ orgId: 'org-a', userId: 'user-1', role: 'associado' })

    const result = await addNota(ctx, 'p1', 'texto')

    expect(result).toEqual(newNota)
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-a', userId: 'user-1', processoId: 'p1' }),
    )
  })
})

describe('updateProcesso', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('lança ForbiddenError quando estagiário tenta atualizar', async () => {
    const { updateProcesso } = await import('@/services/processos')
    const ctx = makeCtx({ role: 'estagiario' })

    await expect(updateProcesso(ctx, 'p1', { status: 'suspenso' })).rejects.toMatchObject({ name: 'ForbiddenError' })
  })

  it('atualiza processo com campos fornecidos', async () => {
    const { db } = await import('@/db')

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'p1', orgId: 'org-a' }]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>)

    const { updateProcesso } = await import('@/services/processos')
    const ctx = makeCtx({ role: 'associado' })

    await updateProcesso(ctx, 'p1', { status: 'suspenso' })

    expect(updateChain.set).toHaveBeenCalledWith({ status: 'suspenso' })
  })
})
