/**
 * Testes unitários para GET /api/notificacoes/[id]/garantia
 *
 * Verifica:
 * - 401 sem sessão
 * - 404 quando notificação não pertence ao org_id
 * - 204 quando notificação existe mas sem protocolo de garantia
 * - 200 com { step, emailEnviadoEm, smsEnviadoEm, whatsappEnviadoEm, backupNotificadoEm, confirmadoEm }
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
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  notificacoes: {
    id: 'id',
    orgId: 'org_id',
    garantiaId: 'garantia_id',
  },
  notificacaoGarantia: {
    id: 'id',
    notificacaoId: 'notificacao_id',
    step: 'step',
    emailEnviadoEm: 'email_enviado_em',
    smsEnviadoEm: 'sms_enviado_em',
    whatsappEnviadoEm: 'whatsapp_enviado_em',
    backupNotificadoEm: 'backup_notificado_em',
    confirmadoEm: 'confirmado_em',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq' })),
  and: vi.fn((...conditions: unknown[]) => ({ type: 'and' })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(url = 'http://localhost:3000/api/notificacoes/notif-1/garantia'): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

const FAKE_CTX = { userId: 'user-1', orgId: 'org-1', role: 'socio' as const };
const FAKE_ID = 'notif-1';
const FAKE_GARANTIA_ID = 'garantia-1';

// ── Testes ────────────────────────────────────────────────────────────────────

describe('GET /api/notificacoes/[id]/garantia', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna 401 quando usuário não autenticado', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    const { UnauthorizedError } = await import('@/lib/errors');
    vi.mocked(requireOrgContext).mockRejectedValue(new UnauthorizedError());

    const { GET } = await import('../[id]/garantia/route');
    const req = makeRequest();
    const res = await GET(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(401);
  });

  it('retorna 404 quando notificação não pertence ao org_id da sessão', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue(FAKE_CTX);

    const { db } = await import('@/db');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // não encontrada
    };
    vi.mocked(db.select).mockReturnValue(chain as unknown as ReturnType<typeof db.select>);

    const { GET } = await import('../[id]/garantia/route');
    const req = makeRequest();
    const res = await GET(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Notificação não encontrada');
  });

  it('retorna 204 quando notificação existe mas sem protocolo de garantia', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue(FAKE_CTX);

    const { db } = await import('@/db');

    // Primeiro select: notificação encontrada sem garantia_id
    const selectChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: FAKE_ID, garantiaId: null }]),
    };

    // Segundo select: nenhuma garantia encontrada por notificacao_id
    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain1 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain2 as unknown as ReturnType<typeof db.select>);

    const { GET } = await import('../[id]/garantia/route');
    const req = makeRequest();
    const res = await GET(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(204);
  });

  it('retorna 200 com dados completos da garantia', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue(FAKE_CTX);

    const { db } = await import('@/db');

    const emailEnviadoEm = new Date('2024-01-15T08:00:00Z');
    const smsEnviadoEm = new Date('2024-01-15T10:00:00Z');
    const confirmadoEm = new Date('2024-01-15T11:00:00Z');

    // Primeiro select: notificação com garantia_id
    const selectChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: FAKE_ID, garantiaId: FAKE_GARANTIA_ID }]),
    };

    // Segundo select: dados da garantia
    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          step: 'confirmado',
          emailEnviadoEm,
          smsEnviadoEm,
          whatsappEnviadoEm: null,
          backupNotificadoEm: null,
          confirmadoEm,
        },
      ]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain1 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain2 as unknown as ReturnType<typeof db.select>);

    const { GET } = await import('../[id]/garantia/route');
    const req = makeRequest();
    const res = await GET(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      step: 'confirmado',
      emailEnviadoEm: emailEnviadoEm.toISOString(),
      smsEnviadoEm: smsEnviadoEm.toISOString(),
      whatsappEnviadoEm: null,
      backupNotificadoEm: null,
      confirmadoEm: confirmadoEm.toISOString(),
    });
  });

  it('retorna campos nulos para timestamps ainda não preenchidos', async () => {
    const { requireOrgContext } = await import('@/lib/org-context');
    vi.mocked(requireOrgContext).mockResolvedValue(FAKE_CTX);

    const { db } = await import('@/db');

    const selectChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: FAKE_ID, garantiaId: FAKE_GARANTIA_ID }]),
    };

    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          step: 'email_enviado',
          emailEnviadoEm: new Date('2024-01-15T08:00:00Z'),
          smsEnviadoEm: null,
          whatsappEnviadoEm: null,
          backupNotificadoEm: null,
          confirmadoEm: null,
        },
      ]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain1 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain2 as unknown as ReturnType<typeof db.select>);

    const { GET } = await import('../[id]/garantia/route');
    const req = makeRequest();
    const res = await GET(req, { params: Promise.resolve({ id: FAKE_ID }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.step).toBe('email_enviado');
    expect(body.smsEnviadoEm).toBeNull();
    expect(body.whatsappEnviadoEm).toBeNull();
    expect(body.backupNotificadoEm).toBeNull();
    expect(body.confirmadoEm).toBeNull();
  });
});
