import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/org-context', () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {
    readonly status = 401;
    constructor(message = 'Não autenticado') {
      super(message);
      this.name = 'UnauthorizedError';
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    readonly status = 403;
    constructor(message = 'Acesso negado') {
      super(message);
      this.name = 'ForbiddenError';
    }
  },
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-id' }),
}));

vi.mock('@/lib/email/templates/ConviteMembro', () => ({
  ConviteMembro: () => null,
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, createElement: vi.fn().mockReturnValue(null) };
});

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  orgMembers: { id: 'id', orgId: 'orgId', userId: 'userId', role: 'role' },
  users: { id: 'id', email: 'email', name: 'name', createdAt: 'createdAt' },
  organizations: { id: 'id', name: 'name' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
  and: vi.fn((...args) => ({ type: 'and', args })),
  count: vi.fn(() => ({ type: 'count' })),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234'),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

const BASE_URL = 'http://localhost:3000/api/organizacoes/me/membros';
const MEMBER_URL = (id: string) => `${BASE_URL}/${id}`;

// ── GET /membros ───────────────────────────────────────────────────────────────

describe('GET /api/organizacoes/me/membros', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retorna 401 quando usuário não autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    const { UnauthorizedError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const { GET } = await import('../membros/route');
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('retorna apenas membros do escritório do usuário autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });

    const { db } = await import('@/db');
    const members = [
      { id: 'member-1', userId: 'user-1', papel: 'socio', nome: 'Alice', email: 'alice@test.com', entradaEm: '2024-01-01' },
    ];
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(members),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const { GET } = await import('../membros/route');
    const req = makeRequest('GET', BASE_URL);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json() as typeof members;
    expect(body).toHaveLength(1);
    expect(body[0].userId).toBe('user-1');
  });
});

// ── POST /membros ──────────────────────────────────────────────────────────────

describe('POST /api/organizacoes/me/membros', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retorna 401 quando usuário não autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    const { UnauthorizedError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const { POST } = await import('../membros/route');
    const req = makeRequest('POST', BASE_URL, { email: 'x@y.com', papel: 'associado' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 403 quando papel insuficiente (associado chamando endpoint)', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    const { ForbiddenError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-2',
      role: 'associado',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ForbiddenError("Papel insuficiente: requerido 'socio', usuário tem 'associado'");
    });

    const { POST } = await import('../membros/route');
    const req = makeRequest('POST', BASE_URL, { email: 'x@y.com', papel: 'associado' });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('retorna 400 quando e-mail não fornecido', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { POST } = await import('../membros/route');
    const req = makeRequest('POST', BASE_URL, { papel: 'associado' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/e-mail/i);
  });

  it('retorna 400 quando papel inválido', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { POST } = await import('../membros/route');
    const req = makeRequest('POST', BASE_URL, { email: 'test@test.com', papel: 'socio' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/papel/i);
  });

  it('cria membro e retorna 201 com e-mail válido', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { db } = await import('@/db');
    const selectMock = vi.fn();
    // First call: check existing user by email -> not found
    // Second call: find org name
    // Third call: find inviter name
    let selectCallCount = 0;
    selectMock.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return Promise.resolve([]); // no existing user
          if (selectCallCount === 2) return Promise.resolve([{ name: 'Escritório A' }]); // org
          return Promise.resolve([{ name: 'Alice' }]); // inviter
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }));
    vi.mocked(db.select).mockImplementation(selectMock);

    const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    const { POST } = await import('../membros/route');
    const req = makeRequest('POST', BASE_URL, { email: 'novo@test.com', papel: 'associado' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

// ── PATCH /membros/:id ────────────────────────────────────────────────────────

describe('PATCH /api/organizacoes/me/membros/:id', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retorna 403 quando papel insuficiente (associado chamando endpoint)', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    const { ForbiddenError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-2',
      role: 'associado',
    });
    vi.mocked(requireRole).mockImplementation(() => {
      throw new ForbiddenError("Papel insuficiente: requerido 'socio', usuário tem 'associado'");
    });

    const { PATCH } = await import('../membros/[id]/route');
    const req = makeRequest('PATCH', MEMBER_URL('member-1'), { papel: 'estagiario' });
    const res = await PATCH(req, { params: { id: 'member-1' } });
    expect(res.status).toBe(403);
  });

  it('retorna 400 quando sócio tenta rebaixar a si mesmo', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { db } = await import('@/db');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'member-1', orgId: 'org-1', userId: 'user-1', role: 'socio' },
        ]),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const { PATCH } = await import('../membros/[id]/route');
    const req = makeRequest('PATCH', MEMBER_URL('member-1'), { papel: 'associado' });
    const res = await PATCH(req, { params: { id: 'member-1' } });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/rebaixar/i);
  });

  it('retorna 403 para membro de outro escritório', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { db } = await import('@/db');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'member-x', orgId: 'org-99', userId: 'user-x', role: 'associado' },
        ]),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const { PATCH } = await import('../membros/[id]/route');
    const req = makeRequest('PATCH', MEMBER_URL('member-x'), { papel: 'estagiario' });
    const res = await PATCH(req, { params: { id: 'member-x' } });
    expect(res.status).toBe(403);
  });

  it('altera papel com sucesso', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { db } = await import('@/db');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'member-2', orgId: 'org-1', userId: 'user-2', role: 'estagiario' },
        ]),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const updateChain = { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    const { PATCH } = await import('../membros/[id]/route');
    const req = makeRequest('PATCH', MEMBER_URL('member-2'), { papel: 'associado' });
    const res = await PATCH(req, { params: { id: 'member-2' } });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

// ── DELETE /membros/:id ───────────────────────────────────────────────────────

describe('DELETE /api/organizacoes/me/membros/:id', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('retorna 400 quando o único sócio tenta se auto-remover', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { db } = await import('@/db');
    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve([
              { id: 'member-1', orgId: 'org-1', userId: 'user-1', role: 'socio' },
            ]);
          }
          return Promise.resolve([{ value: '1' }]); // count of socios = 1
        }),
      }),
    } as unknown as ReturnType<typeof db.select>));

    const { DELETE } = await import('../membros/[id]/route');
    const req = makeRequest('DELETE', MEMBER_URL('member-1'));
    const res = await DELETE(req, { params: { id: 'member-1' } });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/ao menos um sócio/i);
  });

  it('retorna 403 para membro de outro escritório', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { db } = await import('@/db');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'member-x', orgId: 'org-99', userId: 'user-x', role: 'associado' },
        ]),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const { DELETE } = await import('../membros/[id]/route');
    const req = makeRequest('DELETE', MEMBER_URL('member-x'));
    const res = await DELETE(req, { params: { id: 'member-x' } });
    expect(res.status).toBe(403);
  });

  it('remove membro com sucesso', async () => {
    const { requireOrgContext, requireRole } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      role: 'socio',
    });
    vi.mocked(requireRole).mockReturnValue(undefined);

    const { db } = await import('@/db');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'member-2', orgId: 'org-1', userId: 'user-2', role: 'associado' },
        ]),
      }),
    } as unknown as ReturnType<typeof db.select>);

    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(db.delete).mockReturnValue(deleteChain as unknown as ReturnType<typeof db.delete>);

    const { DELETE } = await import('../membros/[id]/route');
    const req = makeRequest('DELETE', MEMBER_URL('member-2'));
    const res = await DELETE(req, { params: { id: 'member-2' } });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
