/**
 * Testes unitários para POST /api/notificacoes/[id]/confirmar
 *
 * Verifica:
 * - 401 sem sessão
 * - 404 quando notificação pertence a outro org_id
 * - 409 quando notificação já confirmada
 * - 200 válido: seta confirmado_em em notificacoes e notificacao_garantia, emite evento Inngest
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/org-context', () => ({
  requireOrgContext: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {
    readonly status = 401;
    constructor(message = 'Não autenticado') {
      super(message);
      this.name = 'UnauthorizedError';
    }
  },
  NotFoundError: class NotFoundError extends Error {
    readonly status = 404;
    constructor(message = 'Recurso não encontrado') {
      super(message);
      this.name = 'NotFoundError';
    }
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  notificacoes: {
    id: 'id',
    orgId: 'org_id',
    garantiaId: 'garantia_id',
    confirmadoEm: 'confirmado_em',
  },
  notificacaoGarantia: {
    id: 'id',
    notificacaoId: 'notificacao_id',
    confirmadoEm: 'confirmado_em',
    step: 'step',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq' })),
  and: vi.fn((...conditions: unknown[]) => ({ type: 'and' })),
  isNull: vi.fn((_col: unknown) => ({ type: 'isNull' })),
}));

vi.mock('@/inngest/client', () => ({
  inngest: {
    send: vi.fn(),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method = 'POST', url = 'http://localhost:3000/api/notificacoes/notif-1/confirmar'): NextRequest {
  return new NextRequest(url, { method });
}

const FAKE_CTX = { userId: 'user-1', orgId: 'org-1', role: 'socio' as const };
const FAKE_ID = 'notif-1';
const FAKE_GARANTIA_ID = 'garantia-1';

// ── Testes ────────────────────────────────────────────────────────────────────

describe('POST /api/notificacoes/[id]/confirmar', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 quando usuário não autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    const { UnauthorizedError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const { POST } = await import('../[id]/confirmar/route');
    const req = makeRequest();
    const res = await POST(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(401);
  });

  it('retorna 404 quando notificação pertence a outro org_id', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue(FAKE_CTX);

    const { db } = await import('@/db');
    // Select retorna array vazio (notificação não encontrada para este org_id)
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(chain as unknown as ReturnType<typeof db.select>);

    const { POST } = await import('../[id]/confirmar/route');
    const req = makeRequest();
    const res = await POST(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Notificação não encontrada');
  });

  it('retorna 409 quando notificação já foi confirmada', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue(FAKE_CTX);

    const { db } = await import('@/db');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: FAKE_ID,
          orgId: 'org-1',
          garantiaId: FAKE_GARANTIA_ID,
          confirmadoEm: new Date('2024-01-15T10:00:00Z'), // já confirmada
        },
      ]),
    };
    vi.mocked(db.select).mockReturnValue(chain as unknown as ReturnType<typeof db.select>);

    const { POST } = await import('../[id]/confirmar/route');
    const req = makeRequest();
    const res = await POST(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Notificação já confirmada');
  });

  it('confirmação válida: seta confirmado_em e emite evento Inngest', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue(FAKE_CTX);

    const { db } = await import('@/db');

    // Select: notificação não confirmada com garantia_id
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: FAKE_ID,
          orgId: 'org-1',
          garantiaId: FAKE_GARANTIA_ID,
          confirmadoEm: null,
        },
      ]),
    };
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);

    // Update: seta confirmado_em
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    const { inngest } = await import('@/inngest/client');
    vi.mocked(inngest.send).mockResolvedValue(undefined as never);

    const { POST } = await import('../[id]/confirmar/route');
    const req = makeRequest();
    const res = await POST(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(200);

    // Verifica que update foi chamado (para notificacoes)
    expect(db.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ confirmadoEm: expect.any(Date) }),
    );

    // Verifica que evento Inngest foi emitido
    expect(inngest.send).toHaveBeenCalledWith({
      name: 'garantia/intimacao.confirmada',
      data: { garantiaId: FAKE_GARANTIA_ID },
    });

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.garantiaId).toBe(FAKE_GARANTIA_ID);
  });

  it('confirmação sem garantia_id: busca garantia por notificacao_id', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue(FAKE_CTX);

    const { db } = await import('@/db');

    // Primeiro select: notificação sem garantia_id
    const selectChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: FAKE_ID,
          orgId: 'org-1',
          garantiaId: null, // sem garantia_id direto
          confirmadoEm: null,
        },
      ]),
    };

    // Segundo select: busca garantia por notificacao_id
    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: FAKE_GARANTIA_ID }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain1 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain2 as unknown as ReturnType<typeof db.select>);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    const { inngest } = await import('@/inngest/client');
    vi.mocked(inngest.send).mockResolvedValue(undefined as never);

    const { POST } = await import('../[id]/confirmar/route');
    const req = makeRequest();
    const res = await POST(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(200);
    expect(inngest.send).toHaveBeenCalledWith({
      name: 'garantia/intimacao.confirmada',
      data: { garantiaId: FAKE_GARANTIA_ID },
    });
  });
});
