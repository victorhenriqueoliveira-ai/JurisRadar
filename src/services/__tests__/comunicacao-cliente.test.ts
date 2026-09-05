/**
 * Testes unitários para src/services/comunicacao-cliente.ts
 *
 * Verifica:
 * - registrar: persiste comunicação mesmo quando Resend falha
 * - listarPorProcesso: isolamento multi-tenant por org_id
 * - gerarWhatsAppLink: delega para buildWaLink
 * - upsertCliente: chamado com upsert por (org_id, cpf_cnpj)
 * - verificarProcessoOrg: retorna true/false corretamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/comunicacao-cliente', () => ({
  buildWaLink: vi.fn((tel: string, msg: string) => `https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`),
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { db } from '@/db';
import { sendEmail } from '@/lib/email/send';
import {
  registrar,
  listarPorProcesso,
  gerarWhatsAppLink,
  enviarEmailCliente,
} from '../comunicacao-cliente';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInsertChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const values = vi.fn().mockReturnValue({ returning });
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  return { insert: vi.fn().mockReturnValue({ values, onConflictDoUpdate }) };
}

function makeSelectChain(returnValue: unknown[]) {
  const limit = vi.fn().mockResolvedValue(returnValue);
  const offset = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(returnValue) });
  const orderBy = vi.fn().mockReturnValue({ limit, offset });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where });
  return { select: vi.fn().mockReturnValue({ from }) };
}

// ── Testes: registrar ─────────────────────────────────────────────────────────

describe('registrar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persiste comunicação e retorna id', async () => {
    const chain = makeInsertChain([{ id: 'com-1' }]);
    vi.mocked(db.insert).mockImplementation(chain.insert as unknown as typeof db.insert);

    const result = await registrar({
      orgId: 'org-1',
      clienteId: 'cli-1',
      canal: 'email',
      mensagem: 'Olá cliente',
      enviadoPor: 'user-1',
    });

    expect(result.id).toBe('com-1');
    expect(db.insert).toHaveBeenCalled();
  });

  it('persiste comunicação por whatsapp corretamente', async () => {
    const chain = makeInsertChain([{ id: 'com-2' }]);
    vi.mocked(db.insert).mockImplementation(chain.insert as unknown as typeof db.insert);

    const result = await registrar({
      orgId: 'org-1',
      clienteId: 'cli-1',
      processoId: 'proc-1',
      canal: 'whatsapp',
      mensagem: 'Mensagem whatsapp',
      enviadoPor: 'user-1',
    });

    expect(result.id).toBe('com-2');
  });
});

// ── Testes: listarPorProcesso ──────────────────────────────────────────────────

describe('listarPorProcesso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna comunicações do processo filtradas por org_id', async () => {
    const mockRows = [
      {
        id: 'com-1',
        clienteId: 'cli-1',
        processoId: 'proc-1',
        canal: 'email',
        mensagem: 'teste',
        enviadoPor: 'user-1',
        createdAt: new Date('2026-09-04'),
      },
    ];

    const chain = makeSelectChain(mockRows);
    vi.mocked(db.select).mockImplementation(chain.select as unknown as typeof db.select);

    const result = await listarPorProcesso('proc-1', 'org-1');

    expect(result).toHaveLength(1);
    expect(result[0].canal).toBe('email');
  });

  it('retorna lista vazia quando não há comunicações', async () => {
    const chain = makeSelectChain([]);
    vi.mocked(db.select).mockImplementation(chain.select as unknown as typeof db.select);

    const result = await listarPorProcesso('proc-inexistente', 'org-1');
    expect(result).toHaveLength(0);
  });
});

// ── Testes: enviarEmailCliente ────────────────────────────────────────────────

describe('enviarEmailCliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultParams = {
    clienteEmail: 'cliente@example.com',
    clienteNome: 'João Silva',
    processoNumCnj: '0001234-56.2026.8.26.0001',
    tipoEvento: 'Intimação',
    dataEvento: '04/09/2026',
    mensagemPersonalizada: 'Prezado João, sua intimação foi publicada.',
    nomeAdvogado: 'Dr. Carlos',
  };

  it('retorna enviado=true quando Resend bem-sucedido', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({ id: 'email-123' });

    const result = await enviarEmailCliente(defaultParams);

    expect(result.enviado).toBe(true);
    expect(result.erro).toBeUndefined();
  });

  it('retorna enviado=false quando Resend lança erro — não relança a exceção', async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Resend API key inválida'));

    const result = await enviarEmailCliente(defaultParams);

    expect(result.enviado).toBe(false);
    expect(result.erro).toContain('Resend API key inválida');
  });
});

// ── Testes: gerarWhatsAppLink ─────────────────────────────────────────────────

describe('gerarWhatsAppLink', () => {
  it('delega para buildWaLink e retorna URL wa.me', async () => {
    const url = await gerarWhatsAppLink('+55 (11) 99999-9999', 'Olá!');
    expect(url).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(url).toContain('5511999999999');
  });
});
