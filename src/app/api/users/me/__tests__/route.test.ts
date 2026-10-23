/**
 * Testes unitários para GET/PATCH /api/users/me.
 *
 * Esta rota é a fonte real de troca de senha e preferências de notificação —
 * usada tanto por /configuracoes quanto por /perfil (Parte 2 da auditoria
 * crm-audit: as abas "Segurança"/"Notificações" de /perfil eram 100% falsas,
 * foram religadas nesta rota).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db/schema', () => ({
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
    cpf: 'cpf',
    oabNumero: 'oab_numero',
    oabEstado: 'oab_estado',
    notificationPrefs: 'notification_prefs',
    systemRole: 'system_role',
    passwordHash: 'password_hash',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

// ── Imports após vi.mock ──────────────────────────────────────────────────────

import { auth } from '@/auth';
import { compare, hash } from 'bcryptjs';
import { GET, PATCH } from '@/app/api/users/me/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION = { user: { id: 'user-1' } };

function makeRequest(body?: unknown): NextRequest {
  const init: RequestInit = { method: 'PATCH' };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest('http://localhost/api/users/me', init);
}

function selectReturning(rows: unknown[]) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ── GET /api/users/me ──────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('retorna 401 quando não autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('retorna 404 quando usuário não existe', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    selectReturning([]);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('retorna os dados do usuário autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    selectReturning([{ id: 'user-1', email: 'a@b.com', name: 'Fulano', notificationPrefs: { emailDesativado: ['resumo_diario'] } }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe('a@b.com');
    expect(body.notificationPrefs.emailDesativado).toEqual(['resumo_diario']);
  });
});

// ── PATCH /api/users/me ─────────────────────────────────────────────────────────

describe('PATCH /api/users/me', () => {
  it('retorna 401 quando não autenticado', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest({ name: 'Novo nome' }));
    expect(res.status).toBe(401);
  });

  it('retorna 400 quando nenhum campo é enviado', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/nenhum campo/i);
  });

  it('atualiza nome com sucesso', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const whereFn = vi.fn().mockResolvedValue(undefined);
    mockUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: whereFn }) });

    const res = await PATCH(makeRequest({ name: 'Fulano da Silva' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('atualiza notificationPrefs com sucesso', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue({ set: setFn });

    const res = await PATCH(makeRequest({ notificationPrefs: { emailDesativado: ['intimacao'] } }));
    expect(res.status).toBe(200);
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({ notificationPrefs: { emailDesativado: ['intimacao'] } }),
    );
  });

  // ── Troca de senha ─────────────────────────────────────────────────────────

  it('retorna 400 quando novaSenha é enviada sem senhaAtual', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await PATCH(makeRequest({ novaSenha: 'novaSenha123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/senha atual é obrigatória/i);
  });

  it('retorna 400 quando novaSenha tem menos de 8 caracteres', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await PATCH(makeRequest({ senhaAtual: 'atual123', novaSenha: '123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/pelo menos 8 caracteres/i);
  });

  it('retorna 400 quando a senha atual está incorreta — não troca a senha', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    selectReturning([{ passwordHash: 'hash-no-banco' }]);
    vi.mocked(compare).mockResolvedValue(false as never);

    const res = await PATCH(makeRequest({ senhaAtual: 'senhaErrada', novaSenha: 'novaSenhaBoa123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/senha atual incorreta/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('troca a senha com sucesso quando a senha atual confere', async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    selectReturning([{ passwordHash: 'hash-no-banco' }]);
    vi.mocked(compare).mockResolvedValue(true as never);
    vi.mocked(hash).mockResolvedValue('novo-hash' as never);

    const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue({ set: setFn });

    const res = await PATCH(makeRequest({ senhaAtual: 'senhaCorreta', novaSenha: 'novaSenhaBoa123' }));
    expect(res.status).toBe(200);
    expect(compare).toHaveBeenCalledWith('senhaCorreta', 'hash-no-banco');
    expect(hash).toHaveBeenCalledWith('novaSenhaBoa123', 12);
    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'novo-hash' }));
  });
});
