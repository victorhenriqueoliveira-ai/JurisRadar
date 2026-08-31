/**
 * Testes unitários — API Anexos (POST + GET)
 *
 * Cobre:
 *   - Autenticação (401 sem sessão)
 *   - Isolamento multi-tenant (404 quando processo de outro org_id)
 *   - Upload válido (PDF 5 MB → persiste e retorna { url, nome })
 *   - Upload inválido (arquivo 11 MB → 413)
 *   - Listagem de anexos filtrada por processo e org
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
}))

vi.mock('@/lib/storage/blob', () => ({
  storageClient: {
    upload: vi.fn(),
    delete: vi.fn(),
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

// Mock do banco com suporte a chamadas encadeadas
const mockReturning = vi.fn()
const mockInsertValues = vi.fn(() => ({ returning: mockReturning }))
const mockInsert = vi.fn(() => ({ values: mockInsertValues }))

const mockSelectWhereLimitAnexos = vi.fn()
const mockSelectWhereAnexos = vi.fn(() => ({ limit: mockSelectWhereLimitAnexos }))
const mockSelectFromAnexos = vi.fn(() => ({ where: mockSelectWhereAnexos }))

const mockSelectWhereLimitProcessos = vi.fn()
const mockSelectWhereProcessos = vi.fn(() => ({ limit: mockSelectWhereLimitProcessos }))
const mockSelectFromProcessos = vi.fn(() => ({ where: mockSelectWhereProcessos }))

// Controla qual "from" será chamado por ordem de invocação
let selectCallCount = 0
const mockSelect = vi.fn(() => {
  selectCallCount++
  // Primeira chamada = processos, segunda = anexos (para GET)
  if (selectCallCount % 2 === 1) {
    return { from: mockSelectFromProcessos }
  }
  return { from: mockSelectFromAnexos }
})

vi.mock('@/db', () => ({
  db: {
    get select() {
      return mockSelect
    },
    get insert() {
      return mockInsert
    },
  },
}))

vi.mock('@/db/schema', () => ({
  processos: { id: 'processos.id', orgId: 'processos.orgId' },
  anexos: {
    id: 'anexos.id',
    orgId: 'anexos.orgId',
    processoId: 'anexos.processoId',
    nome: 'anexos.nome',
    url: 'anexos.url',
    tamanho: 'anexos.tamanho',
    mimeType: 'anexos.mimeType',
    uploadedBy: 'anexos.uploadedBy',
    createdAt: 'anexos.createdAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000/api/processos/processo-1/anexos'

function makeFormDataRequest(file?: File): NextRequest {
  if (!file) {
    return new NextRequest(BASE_URL, { method: 'POST' })
  }
  const formData = new FormData()
  formData.append('arquivo', file)
  return new NextRequest(BASE_URL, { method: 'POST', body: formData })
}

function makeGetRequest(): NextRequest {
  return new NextRequest(BASE_URL, { method: 'GET' })
}

function makeFile(sizeBytes: number, name = 'documento.pdf', type = 'application/pdf'): File {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

const ROUTE_PARAMS = { params: Promise.resolve({ id: 'processo-1' }) }

// ── Testes POST ───────────────────────────────────────────────────────────────

describe('POST /api/processos/[id]/anexos', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    selectCallCount = 0
  })

  it('retorna 401 quando usuário não autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    const { UnauthorizedError } = await import('@/lib/errors')
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError())

    const { POST } = await import('../route')
    const req = makeGetRequest() // método não importa para testar auth
    const res = await POST(req, ROUTE_PARAMS)
    expect(res.status).toBe(401)
  })

  it('retorna 404 quando processo pertence a outro org_id', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    })

    // Processo não encontrado (processo de outro org)
    mockSelectWhereLimitProcessos.mockResolvedValue([])

    const { POST } = await import('../route')
    const file = makeFile(1024)
    const req = makeFormDataRequest(file)
    const res = await POST(req, ROUTE_PARAMS)
    expect(res.status).toBe(404)
  })

  it('retorna 201 com { url, nome } ao fazer upload de PDF de 5 MB', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    })

    // Processo encontrado
    mockSelectWhereLimitProcessos.mockResolvedValue([{ id: 'processo-1' }])

    // StorageClient retorna resultado de upload
    const { storageClient } = await import('@/lib/storage/blob')
    vi.mocked(storageClient.upload).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/org-org-1/processos/processo-1/abc-documento.pdf',
      tamanho: 5 * 1024 * 1024,
      mimeType: 'application/pdf',
    })

    // Insert retorna o novo registro
    mockReturning.mockResolvedValue([
      {
        id: 'anexo-1',
        url: 'https://blob.vercel-storage.com/org-org-1/processos/processo-1/abc-documento.pdf',
        nome: 'documento.pdf',
        tamanho: 5 * 1024 * 1024,
        mimeType: 'application/pdf',
        createdAt: new Date(),
      },
    ])

    const { POST } = await import('../route')
    const file = makeFile(5 * 1024 * 1024, 'documento.pdf', 'application/pdf')
    const req = makeFormDataRequest(file)
    const res = await POST(req, ROUTE_PARAMS)

    expect(res.status).toBe(201)
    const body = await res.json() as { url: string; nome: string }
    expect(body.url).toContain('blob.vercel-storage.com')
    expect(body.nome).toBe('documento.pdf')
  })

  it('retorna 413 quando arquivo excede 10 MB (delegado ao StorageClient)', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    })

    mockSelectWhereLimitProcessos.mockResolvedValue([{ id: 'processo-1' }])

    // StorageClient lança StorageError FILE_TOO_LARGE
    const { storageClient } = await import('@/lib/storage/blob')
    const { StorageError } = await import('@/lib/storage/validation')
    vi.mocked(storageClient.upload).mockRejectedValue(
      new StorageError('FILE_TOO_LARGE', 'Arquivo muito grande: 11.0 MB. O limite é 10 MB.'),
    )

    const { POST } = await import('../route')
    const file = makeFile(11 * 1024 * 1024, 'grande.pdf', 'application/pdf')
    const req = makeFormDataRequest(file)
    const res = await POST(req, ROUTE_PARAMS)
    expect(res.status).toBe(413)
  })

  it('retorna 400 quando campo "arquivo" está ausente', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    })

    mockSelectWhereLimitProcessos.mockResolvedValue([{ id: 'processo-1' }])

    const { POST } = await import('../route')
    // Request sem campo arquivo no FormData
    const req = makeFormDataRequest()
    const res = await POST(req, ROUTE_PARAMS)
    expect(res.status).toBe(400)
  })
})

// ── Testes GET ────────────────────────────────────────────────────────────────

describe('GET /api/processos/[id]/anexos', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    selectCallCount = 0
  })

  it('retorna 401 quando usuário não autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    const { UnauthorizedError } = await import('@/lib/errors')
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError())

    const { GET } = await import('../route')
    const req = makeGetRequest()
    const res = await GET(req, ROUTE_PARAMS)
    expect(res.status).toBe(401)
  })

  it('retorna lista de anexos apenas do processo e org corretos', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    })

    // Processo encontrado
    mockSelectWhereLimitProcessos.mockResolvedValue([{ id: 'processo-1' }])

    // Anexos retornados
    mockSelectWhereAnexos.mockResolvedValue([
      {
        id: 'anexo-1',
        nome: 'documento.pdf',
        url: 'https://blob.vercel-storage.com/org-org-1/processos/processo-1/abc-documento.pdf',
        tamanho: 5 * 1024 * 1024,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
        createdAt: new Date(),
      },
    ])

    const { GET } = await import('../route')
    const req = makeGetRequest()
    const res = await GET(req, ROUTE_PARAMS)

    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[]; total: number }
    expect(body.total).toBe(1)
    expect(body.data).toHaveLength(1)
  })

  it('retorna lista vazia quando processo não tem anexos', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    })

    mockSelectWhereLimitProcessos.mockResolvedValue([{ id: 'processo-1' }])
    mockSelectWhereAnexos.mockResolvedValue([])

    const { GET } = await import('../route')
    const req = makeGetRequest()
    const res = await GET(req, ROUTE_PARAMS)

    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[]; total: number }
    expect(body.total).toBe(0)
    expect(body.data).toHaveLength(0)
  })

  it('retorna 404 quando processo pertence a outro org_id', async () => {
    const { requireOrgContext } = await import('@/lib/org-context')
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    })

    mockSelectWhereLimitProcessos.mockResolvedValue([])

    const { GET } = await import('../route')
    const req = makeGetRequest()
    const res = await GET(req, ROUTE_PARAMS)
    expect(res.status).toBe(404)
  })
})
