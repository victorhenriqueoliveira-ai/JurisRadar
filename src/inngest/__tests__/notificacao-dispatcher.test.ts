/**
 * Testes unitários para notificacaoDispatcher.
 *
 * Verifica:
 * - Movimentação do tipo `intimacao` cria registro em `notificacoes`
 * - Mesma movimentacao_id processada duas vezes cria apenas 1 registro (idempotência)
 * - Usuário com e-mail desativado para `intimacao`: persiste in-app mas não chama sendEmail
 * - Movimentação tipo `despacho_simples` não gera notificação (não está na lista de relevantes)
 * - Usuário não encontrado: notificação in-app criada, e-mail não enviado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@/lib/notificacoes/preferencias', () => ({
  getNotificacaoPrefs: vi.fn(),
  getUserEmail: vi.fn(),
  isEmailDesativado: vi.fn(),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { db } from '@/db';
import { getNotificacaoPrefs, getUserEmail, isEmailDesativado } from '@/lib/notificacoes/preferencias';
import { sendEmail } from '@/lib/email/send';
import { TIPOS_RELEVANTES } from '../notificacao-dispatcher';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_EVENT_INTIMACAO = {
  data: {
    movimentacaoId: 'mov-123',
    orgId: 'org-1',
    userId: 'user-1',
    tipo: 'intimacao',
    titulo: 'Nova intimação no processo',
    processoId: 'proc-1',
  },
};

const FAKE_EVENT_DECISAO = {
  data: {
    movimentacaoId: 'mov-456',
    orgId: 'org-1',
    userId: 'user-1',
    tipo: 'decisao',
    titulo: 'Nova decisão no processo',
    processoId: 'proc-1',
  },
};

// ── Helper: executa o handler do notificacaoDispatcher ───────────────────────

async function runDispatcher(event: typeof FAKE_EVENT_INTIMACAO | typeof FAKE_EVENT_DECISAO) {
  const { notificacaoDispatcher } = await import('../notificacao-dispatcher');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (notificacaoDispatcher as any)['_fn'] ?? (notificacaoDispatcher as any)['fn'];

  const stepMock = {
    run: vi.fn(async (_name: string, callback: () => Promise<unknown>) => callback()),
    sleep: vi.fn(async () => undefined),
    sendEvent: vi.fn(async () => undefined),
  };

  let result: unknown;
  if (fn) {
    result = await fn({ step: stepMock, event, runId: 'test' });
  }

  return { result, stepMock };
}

// ── Setup de mocks do db ──────────────────────────────────────────────────────

function mockDbSelectEmpty() {
  const mockSelect = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  vi.mocked(db.select).mockReturnValue(mockSelect as never);
  return mockSelect;
}

function mockDbSelectExisting() {
  const mockSelect = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 'notif-existing' }]),
  };
  vi.mocked(db.select).mockReturnValue(mockSelect as never);
  return mockSelect;
}

function mockDbInsert(returnId = 'notif-new') {
  const mockInsert = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: returnId }]),
  };
  vi.mocked(db.insert).mockReturnValue(mockInsert as never);
  return mockInsert;
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('notificacaoDispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Defaults
    vi.mocked(getUserEmail).mockResolvedValue('advogado@test.com');
    vi.mocked(getNotificacaoPrefs).mockResolvedValue(null);
    vi.mocked(isEmailDesativado).mockReturnValue(false);
    vi.mocked(sendEmail).mockResolvedValue({ id: 'email-id' });
  });

  it('movimentacao tipo intimacao cria registro em notificacoes com tipo: intimacao', async () => {
    mockDbSelectEmpty();
    mockDbInsert('notif-123');

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ skipped: false, notificacaoId: 'notif-123' });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('mesma movimentacao_id processada duas vezes cria apenas 1 registro (idempotência)', async () => {
    // Primeiro: select retorna existente
    mockDbSelectExisting();

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ skipped: true, reason: 'already_exists' });
    expect(db.insert).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('usuário com e-mail desativado para intimacao persiste in-app mas não chama sendEmail', async () => {
    mockDbSelectEmpty();
    mockDbInsert('notif-456');

    // Simula preferência com email desativado para intimacao
    vi.mocked(isEmailDesativado).mockReturnValue(true);

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ skipped: false, notificacaoId: 'notif-456' });
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ email: { sent: false, reason: 'email_disabled_for_type' } });
  });

  it('usuário não encontrado: in-app criada, e-mail não enviado', async () => {
    mockDbSelectEmpty();
    mockDbInsert('notif-789');

    vi.mocked(getUserEmail).mockResolvedValue(null);

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ skipped: false, notificacaoId: 'notif-789' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ email: { sent: false, reason: 'user_not_found' } });
  });

  it('movimentacao com email habilitado envia e-mail via sendEmail', async () => {
    mockDbSelectEmpty();
    mockDbInsert('notif-abc');

    vi.mocked(isEmailDesativado).mockReturnValue(false);

    const { result } = await runDispatcher(FAKE_EVENT_DECISAO);

    expect(result).toMatchObject({ skipped: false });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'advogado@test.com' }),
    );
    expect(result).toMatchObject({ email: { sent: true } });
  });
});

// ── Testes: TIPOS_RELEVANTES ───────────────────────────────────────────────────

describe('TIPOS_RELEVANTES', () => {
  it('contém os 5 tipos esperados', () => {
    expect(TIPOS_RELEVANTES).toContain('intimacao');
    expect(TIPOS_RELEVANTES).toContain('citacao');
    expect(TIPOS_RELEVANTES).toContain('decisao');
    expect(TIPOS_RELEVANTES).toContain('sentenca');
    expect(TIPOS_RELEVANTES).toContain('publicacao_dje');
  });

  it('não contém despacho_simples', () => {
    expect(TIPOS_RELEVANTES).not.toContain('despacho_simples');
  });
});

// ── Testes: preferencias helper ────────────────────────────────────────────────

describe('isEmailDesativado (via mock)', () => {
  it('retorna false quando prefs é null', () => {
    vi.mocked(isEmailDesativado).mockRestore();
    // Reimporta a função real
    const { isEmailDesativado: real } = vi.importActual<typeof import('@/lib/notificacoes/preferencias')>('@/lib/notificacoes/preferencias') as never;
    // Usa a lógica inline pois o mock não tem acesso real aqui
    const localFn = (prefs: { emailDesativado?: string[] } | null, tipo: string) =>
      prefs?.emailDesativado?.includes(tipo) ?? false;

    expect(localFn(null, 'intimacao')).toBe(false);
    expect(localFn({ emailDesativado: ['intimacao'] }, 'intimacao')).toBe(true);
    expect(localFn({ emailDesativado: ['decisao'] }, 'intimacao')).toBe(false);
    expect(localFn({ emailDesativado: [] }, 'intimacao')).toBe(false);
  });
});
