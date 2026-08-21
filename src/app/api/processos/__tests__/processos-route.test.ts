import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/org-context', () => ({
  requireOrgContext: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(message = 'Não autenticado') {
      super(message);
      this.name = 'UnauthorizedError';
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    constructor(message = 'Proibido') {
      super(message);
      this.name = 'ForbiddenError';
    }
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  processos: {},
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
  ilike: vi.fn((field, value) => ({ type: 'ilike', field, value })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

const BASE_URL = 'http://localhost:3000/api/processos';

// ── Testes ────────────────────────────────────────────────────────────────────

describe('GET /api/processos', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retorna 401 quando usuário não autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    const { UnauthorizedError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const { GET } = await import('../route');
    const req = makeRequest('GET', `${BASE_URL}?q=0001234`);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna lista vazia quando q não é fornecido', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    });

    const { db } = await import('@/db');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const { GET } = await import('../route');
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { total: number };
    expect(body.total).toBe(0);
  });
});

describe('POST /api/processos', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retorna 401 quando usuário não autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    const { UnauthorizedError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const { POST } = await import('../route');
    const req = makeRequest('POST', BASE_URL, { numeroCnj: '0001234-56.2023.8.26.0001' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 422 quando numeroCnj não é fornecido', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    });

    const { POST } = await import('../route');
    const req = makeRequest('POST', BASE_URL, { tribunal: 'TJSP' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('retorna 422 quando numeroCnj é muito curto', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: 'socio',
    });

    const { POST } = await import('../route');
    const req = makeRequest('POST', BASE_URL, { numeroCnj: '123' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
