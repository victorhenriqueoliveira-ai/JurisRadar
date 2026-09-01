/**
 * Testes unitários para PATCH /api/perfil/contato.
 *
 * Mockam @/db, @/auth para isolar o route handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks estáticos ───────────────────────────────────────────────────────────

const mockDbUpdate = vi.fn();

vi.mock('@/db', () => ({
  db: {
    update: () => mockDbUpdate(),
  },
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

vi.mock('@/db/schema', () => ({
  users: { id: 'id', whatsappNumero: 'whatsapp_numero' },
  orgMembers: {},
}));

// ── Imports após vi.mock ──────────────────────────────────────────────────────

import { auth } from '@/auth';
import { PATCH } from '@/app/api/perfil/contato/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_COM_ORG = {
  user: { id: 'user-123', orgId: 'org-abc', role: 'socio' },
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/perfil/contato', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockUpdateChain() {
  mockDbUpdate.mockReturnValue({
    set: () => ({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('PATCH /api/perfil/contato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ whatsapp_numero: '+5511999999999' }));

    expect(res.status).toBe(401);
  });

  it('retorna 401 quando sessão não tem orgId', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-123', orgId: null, role: 'socio' },
    } as never);

    const res = await PATCH(makeRequest({ whatsapp_numero: '+5511999999999' }));

    expect(res.status).toBe(401);
  });

  it('retorna 400 quando whatsapp_numero está ausente', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await PATCH(makeRequest({}));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detalhes).toBeDefined();
    expect(json.detalhes.whatsapp_numero).toBeDefined();
  });

  it('retorna 400 quando whatsapp_numero não está em formato E.164', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await PATCH(makeRequest({ whatsapp_numero: '11999999999' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detalhes.whatsapp_numero).toBeDefined();
  });

  it('atualiza users.whatsapp_numero com número válido e retorna 200', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockUpdateChain();

    const res = await PATCH(makeRequest({ whatsapp_numero: '+5511999999999' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it('retorna 400 para número com DDI errado (+1 EUA)', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await PATCH(makeRequest({ whatsapp_numero: '+12125551234' }));

    expect(res.status).toBe(400);
  });
});
