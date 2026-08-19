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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

const BASE_URL = 'http://localhost:3000/api/busca/favoritos';

// ── Testes ────────────────────────────────────────────────────────────────────

describe('GET /api/busca/favoritos', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-a',
      orgId: 'org-1',
      role: 'socio',
    });
  });

  it('retorna lista vazia para usuário sem favoritos', async () => {
    const { GET } = await import('../route');
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { favoritos: unknown[] };
    expect(body.favoritos).toEqual([]);
  });

  it('retorna 401 quando usuário não autenticado', async () => {
    const { UnauthorizedError } = await import('@/lib/errors');
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const { GET } = await import('../route');
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/busca/favoritos', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-a',
      orgId: 'org-1',
      role: 'socio',
    });
  });

  it('salva um novo favorito com sucesso', async () => {
    const { POST } = await import('../route');
    const req = makeRequest('POST', BASE_URL, {
      nome: 'Busca Alimentos',
      fonte: 'datajud',
      params: { keyword: 'Alimentos', grau: 'G1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json() as { favorito: { id: string; nome: string } };
    expect(body.favorito.nome).toBe('Busca Alimentos');
    expect(body.favorito.id).toBeTruthy();
  });

  it('retorna 422 quando campos obrigatórios ausentes', async () => {
    const { POST } = await import('../route');
    const req = makeRequest('POST', BASE_URL, { nome: 'Sem fonte' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('retorna 401 quando usuário não autenticado', async () => {
    const { UnauthorizedError } = await import('@/lib/errors');
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const { POST } = await import('../route');
    const req = makeRequest('POST', BASE_URL, {
      nome: 'Busca',
      fonte: 'datajud',
      params: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/busca/favoritos', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-a',
      orgId: 'org-1',
      role: 'socio',
    });
  });

  it('retorna 404 ao tentar deletar favorito inexistente', async () => {
    const { DELETE } = await import('../route');
    const req = makeRequest('DELETE', `${BASE_URL}?id=non-existent-id`);
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('retorna 422 quando id não é fornecido', async () => {
    const { DELETE } = await import('../route');
    const req = makeRequest('DELETE', BASE_URL);
    const res = await DELETE(req);
    expect(res.status).toBe(422);
  });

  it('favorito de um usuário não é visível/deletável por outro do mesmo org', async () => {
    // Usuário A salva favorito
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-a',
      orgId: 'org-1',
      role: 'socio',
    });

    const { POST, DELETE } = await import('../route');

    const postReq = makeRequest('POST', BASE_URL, {
      nome: 'Favorito User A',
      fonte: 'datajud',
      params: { keyword: 'Alimentos' },
    });
    const postRes = await POST(postReq);
    const postBody = await postRes.json() as { favorito: { id: string } };
    const favoritoId = postBody.favorito.id;

    // Usuário B (mesmo org) tenta deletar
    vi.mocked(requireOrgContext).mockResolvedValue({
      userId: 'user-b',
      orgId: 'org-1',
      role: 'socio',
    });

    const deleteReq = makeRequest('DELETE', `${BASE_URL}?id=${favoritoId}`);
    const deleteRes = await DELETE(deleteReq);
    // 404 porque user-b não tem esse favorito (isolamento por userId)
    expect(deleteRes.status).toBe(404);
  });
});
