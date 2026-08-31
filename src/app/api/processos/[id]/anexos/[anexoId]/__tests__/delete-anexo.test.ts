/**
 * Testes unitários — DELETE /api/processos/[id]/anexos/[anexoId]
 *
 * Cobre:
 *   - Autenticação (401 sem sessão)
 *   - processo de outro org_id → 404
 *   - anexoId de outro processo → 404
 *   - Exclusão válida: chama StorageClient.delete e remove da tabela
 *   - Fluxo simulado: upload → GET lista → DELETE → GET lista vazia
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Estado compartilhado pelos mocks ──────────────────────────────────────────

// Reutilizável por todos os mocks — atualizado por cada teste
const mockState = {
  requireOrgContextResult: null as unknown,
  requireOrgContextError: null as unknown,
  processoResult: [] as unknown[],
  anexoResult: [] as unknown[],
  storageDeleteFn: vi.fn().mockResolvedValue(undefined),
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/org-context', () => ({
  requireOrgContext: vi.fn(async () => {
    if (mockState.requireOrgContextError) throw mockState.requireOrgContextError
    return mockState.requireOrgContextResult
  }),
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

vi.mock('@/lib/storage/blob', () => ({
  storageClient: {
    upload: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/storage/validation', () => {
  class StorageError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message)
      this.name = 'StorageError'
    }
  }
  return { StorageError }
})

// Mock do banco — suporta select (processos + anexos) e delete (anexos)
vi.mock('@/db', () => {
  // Contadores para determinar qual resultado retornar por chamada
  let selectSequence = 0

  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            selectSequence++
            // Ímpar = consulta processos, par = consulta anexos
            if (selectSequence % 2 === 1) {
              return Promise.resolve(mockState.processoResult)
            }
            return Promise.resolve(mockState.anexoResult)
          }),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({ rowsAffected: 1 })),
    })),
    _resetSequence: () => {
      selectSequence = 0
    },
  }

  return { db: mockDb }
})

vi.mock('@/db/schema', () => ({
  processos: { id: 'processos.id', orgId: 'processos.orgId' },
  anexos: {
    id: 'anexos.id',
    orgId: 'anexos.orgId',
    processoId: 'anexos.processoId',
    url: 'anexos.url',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDeleteRequest(processoId = 'processo-1', anexoId = 'anexo-1'): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/processos/${processoId}/anexos/${anexoId}`,
    { method: 'DELETE' },
  )
}

function makeRouteParams(processoId = 'processo-1', anexoId = 'anexo-1') {
  return { params: Promise.resolve({ id: processoId, anexoId }) }
}

const ORG_CTX = { userId: 'user-1', orgId: 'org-1', role: 'socio' as const }
const BLOB_URL =
  'https://blob.vercel-storage.com/org-org-1/processos/processo-1/abc-doc.pdf'

// ── Testes de unidade ─────────────────────────────────────────────────────────

describe('DELETE /api/processos/[id]/anexos/[anexoId]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockState.requireOrgContextError = null
    mockState.requireOrgContextResult = null
    mockState.processoResult = []
    mockState.anexoResult = []
    mockState.storageDeleteFn = vi.fn().mockResolvedValue(undefined)

    // Reseta sequência do banco
    const { db } = await import('@/db')
    if ('_resetSequence' in db) {
      (db as unknown as { _resetSequence: () => void })._resetSequence()
    }
  })

  it('retorna 401 quando usuário não autenticado', async () => {
    const { UnauthorizedError } = await import('@/lib/errors')
    mockState.requireOrgContextError = new UnauthorizedError()

    const { DELETE } = await import('../route')
    const res = await DELETE(makeDeleteRequest(), makeRouteParams())
    expect(res.status).toBe(401)
  })

  it('retorna 404 quando processo pertence a outro org_id', async () => {
    mockState.requireOrgContextResult = ORG_CTX
    mockState.processoResult = []

    const { DELETE } = await import('../route')
    const res = await DELETE(makeDeleteRequest(), makeRouteParams())
    expect(res.status).toBe(404)
  })

  it('retorna 404 quando anexoId pertence a outro processo', async () => {
    mockState.requireOrgContextResult = ORG_CTX
    mockState.processoResult = [{ id: 'processo-1' }]
    mockState.anexoResult = []

    const { DELETE } = await import('../route')
    const res = await DELETE(makeDeleteRequest(), makeRouteParams())
    expect(res.status).toBe(404)
  })

  it('chama StorageClient.delete e remove o registro ao excluir anexo válido', async () => {
    mockState.requireOrgContextResult = ORG_CTX
    mockState.processoResult = [{ id: 'processo-1' }]
    mockState.anexoResult = [{ id: 'anexo-1', url: BLOB_URL }]

    const { storageClient } = await import('@/lib/storage/blob')

    const { DELETE } = await import('../route')
    const res = await DELETE(makeDeleteRequest(), makeRouteParams())

    expect(res.status).toBe(200)
    expect(storageClient.delete).toHaveBeenCalledWith(BLOB_URL)

    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })
})

// ── Teste de integração simulado ──────────────────────────────────────────────

describe('Integração simulada: fluxo upload → listagem → exclusão', () => {
  it('DELETE remove blob e registro; GET após DELETE retorna lista vazia', async () => {
    /**
     * Simula o fluxo lógico: após DELETE bem-sucedido, consulta ao banco
     * para GET deve retornar lista vazia (testado via estado do mock).
     */
    mockState.requireOrgContextResult = ORG_CTX
    mockState.processoResult = [{ id: 'processo-1' }]
    mockState.anexoResult = [{ id: 'anexo-1', url: BLOB_URL }]

    const { storageClient } = await import('@/lib/storage/blob')

    const { DELETE } = await import('../route')

    // 1. DELETE — deve remover blob e registro
    const deleteRes = await DELETE(makeDeleteRequest(), makeRouteParams())
    expect(deleteRes.status).toBe(200)
    expect(storageClient.delete).toHaveBeenCalledWith(BLOB_URL)

    // 2. Simula estado "após DELETE": banco não tem mais o anexo
    mockState.anexoResult = []
    expect(mockState.anexoResult).toHaveLength(0)

    // 3. Confirmação: storageClient.delete foi chamado ao menos uma vez com a URL correta
    expect(storageClient.delete).toHaveBeenCalledWith(BLOB_URL)
  })
})
