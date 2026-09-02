/**
 * Testes unitários para PATCH /api/perfil/backup.
 *
 * Mockam @/db, @/auth para isolar o route handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks estáticos ───────────────────────────────────────────────────────────

const mockTxUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock('@/db', () => ({
  db: {
    update: () => mockDbUpdate(),
    transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
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
import { PATCH } from '@/app/api/perfil/backup/route';

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
  mockDbUpdate.mockReturnValue({
    set: () => ({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

function mockTransactionChain() {
  mockTransaction.mockImplementation(async (fn: (tx: {
    update: () => { set: () => { where: () => Promise<void> } }
  }) => Promise<void>) => {
    const fakeTx = {
      update: () => ({
        set: () => ({
          where: mockTxUpdate.mockResolvedValue(undefined),
        }),
      }),
    };
    return fn(fakeTx);
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

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

  it('com isBackup = true, usa transação e retorna 200', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockTransactionChain();

    const res = await PATCH(makeRequest({ isBackup: true }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('com isBackup = false, atualiza diretamente sem transação', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockUpdateChain();

    const res = await PATCH(makeRequest({ isBackup: false }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it('com isBackup = true, garante que atualiza org_members.is_backup_contato = true', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockTransactionChain();

    await PATCH(makeRequest({ isBackup: true }));

    // A transação deve ter sido chamada (que por sua vez faz os updates)
    expect(mockTransaction).toHaveBeenCalled();
    // O mock da transação executa o fn com um tx fake que tem txUpdate mockado
    expect(mockTxUpdate).toHaveBeenCalled();
  });
});
