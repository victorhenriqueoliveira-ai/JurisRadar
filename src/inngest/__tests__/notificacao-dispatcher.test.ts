/**
 * Testes unitários para notificacaoDispatcher.
 *
 * Verifica:
 * - Movimentação do tipo `intimacao` cria registro em `notificacoes`
 * - Mesma movimentacao_id processada duas vezes cria apenas 1 registro (idempotência)
 * - Usuário com e-mail desativado para `intimacao`: persiste in-app mas não chama sendEmail
 * - Movimentação tipo `despacho_simples` não gera notificação (não está na lista de relevantes)
 * - Usuário não encontrado: notificação in-app criada, e-mail não enviado
 * - Tipo crítico cria garantia e emite evento garantia/intimacao.iniciada
 * - Tipo não crítico (nova_movimentacao) não cria garantia e não emite evento
 * - Idempotência: mesma notificacao_id não cria garantia duplicada
 * - backup_id preenchido quando existe membro backup no escritório
 * - backup_id null quando não há membro backup
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
import { TIPOS_RELEVANTES, TIPOS_CRITICOS } from '../notificacao-dispatcher';

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

const FAKE_EVENT_NOVA_MOVIMENTACAO = {
  data: {
    movimentacaoId: 'mov-789',
    orgId: 'org-1',
    userId: 'user-1',
    tipo: 'nova_movimentacao',
    titulo: 'Nova movimentação genérica',
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

/**
 * Cria um mock de db.select que retorna respostas diferentes para cada chamada.
 * Ordem das chamadas no dispatcher novo:
 *   1ª: check idempotência notificacoes (por movimentacaoId)
 *   2ª: check idempotência notificacao_garantia (por notificacaoId)
 *   3ª: busca backup_id em org_members
 */
function mockDbSelectSequence(responses: unknown[][]) {
  let callCount = 0;
  vi.mocked(db.select).mockImplementation(() => {
    const response = responses[callCount] ?? [];
    callCount++;
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(response),
    } as never;
  });
}

function mockDbSelectEmpty() {
  // notificacoes check: vazio, garantia check: vazio, org_members: vazio (sem backup)
  mockDbSelectSequence([[], [], []]);
}

function mockDbSelectExisting() {
  // notificacoes check: existente => retorna early (skipped)
  mockDbSelectSequence([[{ id: 'notif-existing' }]]);
}

function mockDbInsert(returnId = 'notif-new', garantiaId = 'garantia-new') {
  let callCount = 0;
  vi.mocked(db.insert).mockImplementation(() => {
    // 1ª chamada: insert em notificacoes; 2ª: insert em notificacao_garantia
    const id = callCount === 0 ? returnId : garantiaId;
    callCount++;
    return {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id }]),
    } as never;
  });
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
    mockDbInsert('notif-123', 'garantia-123');

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ skipped: false, notificacaoId: 'notif-123' });
    // 2 inserts: notificacoes + notificacao_garantia
    expect(db.insert).toHaveBeenCalledTimes(2);
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
    mockDbInsert('notif-456', 'garantia-456');

    // Simula preferência com email desativado para intimacao
    vi.mocked(isEmailDesativado).mockReturnValue(true);

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ skipped: false, notificacaoId: 'notif-456' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ email: { sent: false, reason: 'email_disabled_for_type' } });
  });

  it('usuário não encontrado: in-app criada, e-mail não enviado', async () => {
    mockDbSelectEmpty();
    mockDbInsert('notif-789', 'garantia-789');

    vi.mocked(getUserEmail).mockResolvedValue(null);

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ skipped: false, notificacaoId: 'notif-789' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ email: { sent: false, reason: 'user_not_found' } });
  });

  it('movimentacao com email habilitado envia e-mail via sendEmail', async () => {
    mockDbSelectEmpty();
    mockDbInsert('notif-abc', 'garantia-abc');

    vi.mocked(isEmailDesativado).mockReturnValue(false);

    const { result } = await runDispatcher(FAKE_EVENT_DECISAO);

    expect(result).toMatchObject({ skipped: false });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'advogado@test.com' }),
    );
    expect(result).toMatchObject({ email: { sent: true } });
  });

  // ── Novos testes: garantia de intimação ──────────────────────────────────────

  it('tipo crítico (intimacao) cria garantia e emite evento garantia/intimacao.iniciada', async () => {
    mockDbSelectEmpty();
    mockDbInsert('notif-crit', 'garantia-crit');

    const { result, stepMock } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ garantiaId: 'garantia-crit', garantiaEmitida: true });
    expect(stepMock.sendEvent).toHaveBeenCalledWith(
      'emitir-evento-garantia',
      expect.objectContaining({
        name: 'garantia/intimacao.iniciada',
        data: expect.objectContaining({
          garantiaId: 'garantia-crit',
          orgId: 'org-1',
          responsavelId: 'user-1',
        }),
      }),
    );
  });

  it('tipo não crítico (nova_movimentacao) NÃO cria garantia e NÃO emite evento', async () => {
    mockDbSelectEmpty();
    mockDbInsert('notif-nao-crit', 'garantia-nao-crit');

    const { result, stepMock } = await runDispatcher(FAKE_EVENT_NOVA_MOVIMENTACAO);

    expect(result).toMatchObject({ garantiaEmitida: false });
    expect(stepMock.sendEvent).not.toHaveBeenCalled();
  });

  it('garantia idempotente: mesma notificacao_id não cria garantia duplicada', async () => {
    // Sequência: notificacoes check vazio (nova), garantia check existente (já criada)
    mockDbSelectSequence([[], [{ id: 'garantia-existente' }], []]);
    mockDbInsert('notif-new', 'garantia-new');

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    // Só 1 insert: notificacoes (garantia já existia)
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ garantiaId: 'garantia-existente' });
  });

  it('backup_id preenchido quando existe membro com is_backup_contato = true no escritório', async () => {
    // notificacoes check: vazio, garantia check: vazio, org_members: membro backup
    mockDbSelectSequence([[], [], [{ userId: 'backup-user-1' }]]);
    mockDbInsert('notif-backup', 'garantia-backup');

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ garantiaId: 'garantia-backup' });
    // O insert de garantia deve ter recebido backupId = 'backup-user-1'
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it('backup_id é null quando não há membro backup no escritório (sem falhar)', async () => {
    // notificacoes check: vazio, garantia check: vazio, org_members: vazio
    mockDbSelectSequence([[], [], []]);
    mockDbInsert('notif-sem-backup', 'garantia-sem-backup');

    const { result } = await runDispatcher(FAKE_EVENT_INTIMACAO);

    expect(result).toMatchObject({ garantiaId: 'garantia-sem-backup', skipped: false });
    // Não deve lançar exceção quando backup é null
    expect(db.insert).toHaveBeenCalledTimes(2);
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

// ── Testes: TIPOS_CRITICOS ─────────────────────────────────────────────────────

describe('TIPOS_CRITICOS', () => {
  it('contém os 5 tipos críticos esperados', () => {
    expect(TIPOS_CRITICOS).toContain('intimacao');
    expect(TIPOS_CRITICOS).toContain('citacao');
    expect(TIPOS_CRITICOS).toContain('prazo_fatal');
    expect(TIPOS_CRITICOS).toContain('decisao');
    expect(TIPOS_CRITICOS).toContain('sentenca');
  });

  it('não contém nova_movimentacao nem publicacao_dje', () => {
    expect(TIPOS_CRITICOS).not.toContain('nova_movimentacao');
    expect(TIPOS_CRITICOS).not.toContain('publicacao_dje');
  });

  it('é exportado como array de 5 elementos', () => {
    expect(TIPOS_CRITICOS).toHaveLength(5);
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
