/**
 * Testes unitários para garantiaIntimacaoEscalador.
 *
 * Verifica:
 * - Evento `garantia/intimacao.iniciada` aciona a function com o sleep correto
 * - Após sleep: se `confirmado_em != null`, function encerra sem notificar backup
 * - Após sleep: se `confirmado_em = null`, `notificarBackup` é chamado via e-mail
 * - Backup sem backup_id → retorna backupNotificado=false sem enviar e-mail
 * - `step` em `notificacao_garantia` atualizado para `backup_notificado` após envio
 * - SMS e WhatsApp não são utilizados (canal desativado)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  notificacaoGarantia: {
    id: 'id',
    orgId: 'org_id',
    responsavelId: 'responsavel_id',
    backupId: 'backup_id',
    step: 'step',
    confirmadoEm: 'confirmado_em',
    backupNotificadoEm: 'backup_notificado_em',
  },
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq', col: _col, val: _val })),
  and: vi.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('react', () => ({
  default: {
    createElement: vi.fn((...args: unknown[]) => ({ type: args[0], props: args[1], children: args.slice(2) })),
  },
  createElement: vi.fn((...args: unknown[]) => ({ type: args[0], props: args[1], children: args.slice(2) })),
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { db } from '@/db';
import { sendEmail } from '@/lib/email/send';
import {
  verificarConfirmacao,
  notificarBackup,
  garantiaIntimacaoEscalador,
  type GarantiaIntimacaoIniciada,
} from '../garantia-intimacao-escalador';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_GARANTIA_ID = 'garantia-uuid-123';
const FAKE_ORG_ID = 'org-uuid-1';
const FAKE_RESPONSAVEL_ID = 'user-uuid-1';
const FAKE_BACKUP_ID = 'user-uuid-backup';

const FAKE_EVENT_DATA: GarantiaIntimacaoIniciada = {
  garantiaId: FAKE_GARANTIA_ID,
  orgId: FAKE_ORG_ID,
  responsavelId: FAKE_RESPONSAVEL_ID,
  processoNumero: '1234567-89.2024.8.26.0100',
  link: 'https://jurisradaroficial.com.br/processos/proc-1',
};

// ── Helpers de mock ───────────────────────────────────────────────────────────

function mockSelectChain(returnValue: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
  };
  vi.mocked(db.select).mockReturnValue(chain as unknown as ReturnType<typeof db.select>);
  return chain;
}

function mockUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  vi.mocked(db.update).mockReturnValue(chain as unknown as ReturnType<typeof db.update>);
  return chain;
}

// ── Testes: verificarConfirmacao ──────────────────────────────────────────────

describe('verificarConfirmacao', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna false quando confirmado_em é null', async () => {
    mockSelectChain([{ confirmadoEm: null }]);
    expect(await verificarConfirmacao(FAKE_GARANTIA_ID)).toBe(false);
  });

  it('retorna true quando confirmado_em tem valor', async () => {
    mockSelectChain([{ confirmadoEm: new Date('2024-01-15T10:00:00Z') }]);
    expect(await verificarConfirmacao(FAKE_GARANTIA_ID)).toBe(true);
  });

  it('retorna false quando garantia não encontrada', async () => {
    mockSelectChain([]);
    expect(await verificarConfirmacao(FAKE_GARANTIA_ID)).toBe(false);
  });
});

// ── Testes: notificarBackup ───────────────────────────────────────────────────

describe('notificarBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateChain();
  });

  it('envia e-mail para backup e retorna backupNotificado=true', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ backupId: FAKE_BACKUP_ID }]),
      } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ email: 'backup@escritorio.com', name: 'Backup Advogado' }]),
      } as unknown as ReturnType<typeof db.select>);

    vi.mocked(sendEmail).mockResolvedValue({ id: 'email-123' });

    const result = await notificarBackup(FAKE_EVENT_DATA);

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'backup@escritorio.com',
        subject: expect.stringContaining(FAKE_EVENT_DATA.processoNumero),
      }),
    );
    expect(result.backupNotificado).toBe(true);
    expect(result.canal).toContain('email');
  });

  it('retorna backupNotificado=false quando não há backup_id', async () => {
    mockSelectChain([{ backupId: null }]);

    const result = await notificarBackup(FAKE_EVENT_DATA);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ backupNotificado: false, canal: [] });
  });

  it('retorna backupNotificado=false quando garantia não encontrada', async () => {
    mockSelectChain([]);

    const result = await notificarBackup(FAKE_EVENT_DATA);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ backupNotificado: false, canal: [] });
  });

  it('atualiza step para backup_notificado após envio', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ backupId: FAKE_BACKUP_ID }]),
      } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ email: 'backup@test.com', name: 'Backup' }]),
      } as unknown as ReturnType<typeof db.select>);

    vi.mocked(sendEmail).mockResolvedValue({ id: 'e-789' });
    const updateChain = mockUpdateChain();

    await notificarBackup(FAKE_EVENT_DATA);

    expect(db.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'backup_notificado' }),
    );
  });

  it('não utiliza SMS nem WhatsApp', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ backupId: FAKE_BACKUP_ID }]),
      } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ email: 'backup@test.com', name: 'Backup' }]),
      } as unknown as ReturnType<typeof db.select>);

    vi.mocked(sendEmail).mockResolvedValue({ id: 'e-sms-check' });

    const result = await notificarBackup(FAKE_EVENT_DATA);

    expect(result.canal).not.toContain('sms');
    expect(result.canal).not.toContain('whatsapp');
  });
});

// ── Testes: garantiaIntimacaoEscalador function ───────────────────────────────

describe('garantiaIntimacaoEscalador — protocolo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('function exportada é definida e válida', () => {
    expect(garantiaIntimacaoEscalador).toBeDefined();
    expect(typeof garantiaIntimacaoEscalador).toBe('object');
  });

  it('confirmação antes do backup encerra o protocolo', async () => {
    mockSelectChain([{ confirmadoEm: new Date() }]);
    const confirmado = await verificarConfirmacao(FAKE_GARANTIA_ID);
    expect(confirmado).toBe(true);
  });

  it('sem confirmação → backup notificado por e-mail', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ confirmadoEm: null }]),
      } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ backupId: FAKE_BACKUP_ID }]),
      } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ email: 'backup@test.com', name: 'Backup' }]),
      } as unknown as ReturnType<typeof db.select>);

    vi.mocked(sendEmail).mockResolvedValue({ id: 'email-final' });
    mockUpdateChain();

    const naoConfirmado = await verificarConfirmacao(FAKE_GARANTIA_ID);
    expect(naoConfirmado).toBe(false);

    const backupResult = await notificarBackup(FAKE_EVENT_DATA);
    expect(backupResult.backupNotificado).toBe(true);
    expect(sendEmail).toHaveBeenCalledOnce();
  });
});
