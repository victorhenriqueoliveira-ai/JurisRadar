/**
 * Testes unitários para PATCH /api/perfil/backup.
 *
 * Mockam @/db, @/auth para isolar o route handler.
 *
 * Nota: a rota NÃO usa db.transaction() — o driver neon-http (HTTP, usado em
 * produção) não suporta transações ("No transactions support in neon-http
 * driver", confirmado ao vivo durante a Fase 2 da auditoria crm-audit). As
 * duas atualizações (resetar outros membros, setar o atual) rodam em
 * sequência, sem wrap transacional.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks estáticos ───────────────────────────────────────────────────────────

const mockDbUpdate = vi.fn();
const mockDbSelect = vi.fn();

vi.mock('@/db', () => ({
  db: {
    update: () => mockDbUpdate(),
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ eq: true, field: a, value: b })),
  ne: vi.fn((a, b) => ({ ne: true, field: a, value: b })),
  and: vi.fn((...args) => ({ and: true, args })),
}));

vi.mock('@/db/schema', () => ({
  orgMembers: { orgId: 'org_id', userId: 'user_id', isBackupContato: 'is_backup_contato' },
}));

// ── Imports após vi.mock ──────────────────────────────────────────────────────

import { auth } from '@/auth';
import { GET, PATCH } from '@/app/api/perfil/backup/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_COM_ORG = {
  user: { id: 'user-123', orgId: 'org-abc', role: 'socio' },
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/perfil/backup', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  mockDbUpdate.mockReturnValue({
    set: () => ({ where }),
  });
  return where;
}

function mockSelectChain(rows: unknown[]) {
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('GET /api/perfil/backup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('retorna isBackup = true quando o membro é o backup atual', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectChain([{ isBackupContato: true }]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isBackup).toBe(true);
  });

  it('retorna isBackup = false quando não há registro de membro', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectChain([]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isBackup).toBe(false);
  });
});

describe('PATCH /api/perfil/backup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest({ isBackup: true }));

    expect(res.status).toBe(401);
  });

  it('retorna 400 quando body não tem isBackup', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await PATCH(makeRequest({}));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detalhes).toBeDefined();
    expect(json.detalhes.isBackup).toBeDefined();
  });

  it('retorna 400 quando isBackup não é boolean', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await PATCH(makeRequest({ isBackup: 'sim' }));

    expect(res.status).toBe(400);
  });

  it('com isBackup = true, atualiza em duas chamadas sequenciais (sem transação) e retorna 200', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    const where = mockUpdateChain();

    const res = await PATCH(makeRequest({ isBackup: true }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    // Uma chamada para resetar os outros membros, outra para setar o atual
    expect(mockDbUpdate).toHaveBeenCalledTimes(2);
    expect(where).toHaveBeenCalledTimes(2);
  });

  it('com isBackup = false, atualiza diretamente numa única chamada', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    const where = mockUpdateChain();

    const res = await PATCH(makeRequest({ isBackup: false }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockDbUpdate).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
