/**
 * Testes unitários — PUT/DELETE /api/calendario/eventos/[id]
 *
 * Cobre o novo campo `concluido` (Fase 3): marcar/desmarcar um evento de
 * calendário ou de agenda pessoal como concluído precisa persistir, com
 * isolamento multi-tenant (where org_id = ctx.orgId).
 */

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
}));

const mockDbUpdate = vi.fn();

vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mockDbUpdate(...args),
  },
}));

vi.mock('@/db/schema', () => ({
  eventosCalendario: { id: 'id', orgId: 'org_id', titulo: 'titulo', data: 'data', tipo: 'tipo', horaInicio: 'hora_inicio', horaFim: 'hora_fim', responsavelId: 'responsavel_id', concluido: 'concluido' },
  eventosAgenda: { id: 'id', orgId: 'org_id', titulo: 'titulo', data: 'data', tipo: 'tipo', descricao: 'descricao', horaInicio: 'hora_inicio', horaFim: 'hora_fim', responsavelId: 'responsavel_id', concluido: 'concluido' },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
}));

// ── Imports após vi.mock ──────────────────────────────────────────────────────

import { requireOrgContext } from '@/lib/org-context';
import { PUT } from '../route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CTX = { orgId: 'org-a', userId: 'user-1', role: 'socio' as const };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/calendario/eventos/ev-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockUpdateChain(returning: unknown[]) {
  mockDbUpdate.mockReturnValue({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returning),
  });
}

describe('PUT /api/calendario/eventos/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marca um evento de fonte "calendario" como concluído', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX);
    let capturedSet: Record<string, unknown> = {};
    mockDbUpdate.mockReturnValue({
      set: vi.fn((vals) => { capturedSet = vals; return { where: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: 'ev-1' }]) }; }),
    });

    const response = await PUT(makeRequest({ fonte: 'calendario', concluido: true }), { params: Promise.resolve({ id: 'ev-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, fonte: 'calendario' });
    expect(capturedSet.concluido).toBe(true);
  });

  it('desmarca um evento de fonte "agenda" (concluido: false)', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX);
    let capturedSet: Record<string, unknown> = {};
    mockDbUpdate.mockReturnValue({
      set: vi.fn((vals) => { capturedSet = vals; return { where: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: 'ev-2' }]) }; }),
    });

    const response = await PUT(makeRequest({ fonte: 'agenda', concluido: false }), { params: Promise.resolve({ id: 'ev-2' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, fonte: 'agenda' });
    expect(capturedSet.concluido).toBe(false);
  });

  it('retorna 404 quando o evento não existe ou não pertence ao org', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX);
    mockUpdateChain([]);

    const response = await PUT(makeRequest({ fonte: 'calendario', concluido: true }), { params: Promise.resolve({ id: 'ev-inexistente' }) });

    expect(response.status).toBe(404);
  });

  it('retorna 400 quando fonte é inválida', async () => {
    vi.mocked(requireOrgContext).mockResolvedValue(CTX);

    const response = await PUT(makeRequest({ fonte: 'invalida', concluido: true }), { params: Promise.resolve({ id: 'ev-1' }) });

    expect(response.status).toBe(400);
  });

  it('retorna 401 quando não autenticado', async () => {
    const { UnauthorizedError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const response = await PUT(makeRequest({ fonte: 'calendario', concluido: true }), { params: Promise.resolve({ id: 'ev-1' }) });

    expect(response.status).toBe(401);
  });
});
