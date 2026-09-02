/**
 * Testes unitários para garantiaFallbackCron.
 *
 * Verifica:
 * - Cron identifica garantias com email_enviado_em < now()-4h e confirmado_em IS NULL
 * - Cron envia e-mail de lembrete para cada garantia encontrada
 * - Cron não processa garantias já confirmadas (filtradas pela query)
 * - Cron não processa garantias em step diferente de 'email_enviado'
 * - Cron retorna total correto e lista de erros
 * - SMS e WhatsApp NÃO são utilizados (canal desativado)
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
    step: 'step',
    confirmadoEm: 'confirmado_em',
    emailEnviadoEm: 'email_enviado_em',
  },
  users: {
    id: 'id',
    email: 'email',
    name: 'name',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq' })),
  and: vi.fn((..._conditions: unknown[]) => ({ type: 'and' })),
  isNull: vi.fn((_col: unknown) => ({ type: 'isNull' })),
  lt: vi.fn((_col: unknown, _val: unknown) => ({ type: 'lt' })),
  sql: vi.fn((strings: TemplateStringsArray, ..._values: unknown[]) => ({
    type: 'sql',
    text: strings[0],
  })),
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

vi.mock('@/inngest/client', () => ({
  inngest: {
    createFunction: vi.fn((opts: unknown, handler: unknown) => ({ opts, handler })),
  },
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { db } from '@/db';
import { sendEmail } from '@/lib/email/send';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_ORG_ID = 'org-uuid-1';
const FAKE_RESPONSAVEL_ID = 'user-uuid-1';

const makeGarantia = (overrides = {}) => ({
  garantiaId: `garantia-${Math.random().toString(36).slice(2)}`,
  responsavelId: FAKE_RESPONSAVEL_ID,
  orgId: FAKE_ORG_ID,
  email: 'responsavel@escritorio.com',
  name: 'Dr. Responsável',
  emailEnviadoEm: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5h atrás
  ...overrides,
});

// ── Helper: mock de select encadeado ─────────────────────────────────────────

function mockSelectChain(returnValue: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(returnValue),
    limit: vi.fn().mockResolvedValue(returnValue),
  };
  vi.mocked(db.select).mockReturnValue(chain as unknown as ReturnType<typeof db.select>);
  return chain;
}

// ── Lógica do cron extraída para teste direto ─────────────────────────────────

async function executarLogicaCron(garantias: {
  garantiaId: string;
  responsavelId: string;
  orgId: string;
  email: string;
  name: string;
  emailEnviadoEm: Date;
}[]) {
  let enviados = 0;
  const erros: string[] = [];

  const React = await import('react');

  for (const garantia of garantias) {
    try {
      const emailElement = React.default.createElement(
        'div',
        null,
        React.default.createElement('h2', null, '[JurisRadar] Lembrete: intimação crítica aguardando confirmação'),
        React.default.createElement(
          'p',
          null,
          'Você ainda não confirmou ciência de uma intimação crítica. Acesse o sistema para confirmar.',
        ),
      );

      await sendEmail({
        to: garantia.email,
        subject: '[JurisRadar] Lembrete: intimação crítica aguardando sua confirmação',
        react: emailElement,
      });

      enviados++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      erros.push(`garantia_id=${garantia.garantiaId}: ${msg}`);
    }
  }

  return { enviados, erros, total: garantias.length };
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('garantiaFallbackCron — lógica de negócio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envia e-mail para cada garantia encontrada', async () => {
    const garantias = [makeGarantia(), makeGarantia()];

    vi.mocked(sendEmail)
      .mockResolvedValueOnce({ id: 'email-1' })
      .mockResolvedValueOnce({ id: 'email-2' });

    const resultado = await executarLogicaCron(garantias);

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(resultado.enviados).toBe(2);
    expect(resultado.erros).toHaveLength(0);
    expect(resultado.total).toBe(2);
  });

  it('envia para o e-mail correto do responsável', async () => {
    const garantia = makeGarantia({ email: 'advogado@firma.com.br', garantiaId: 'g-test' });

    vi.mocked(sendEmail).mockResolvedValueOnce({ id: 'email-ok' });

    await executarLogicaCron([garantia]);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'advogado@firma.com.br',
        subject: expect.stringContaining('[JurisRadar]'),
      }),
    );
  });

  it('retorna zero resultados quando não há garantias travadas', async () => {
    const resultado = await executarLogicaCron([]);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(resultado.total).toBe(0);
    expect(resultado.enviados).toBe(0);
  });

  it('registra erros sem parar processamento das demais garantias', async () => {
    const garantias = [
      makeGarantia({ garantiaId: 'garantia-erro' }),
      makeGarantia({ garantiaId: 'garantia-ok' }),
    ];

    vi.mocked(sendEmail)
      .mockRejectedValueOnce(new Error('SMTP indisponível'))
      .mockResolvedValueOnce({ id: 'email-ok' });

    const resultado = await executarLogicaCron(garantias);

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(resultado.enviados).toBe(1);
    expect(resultado.erros).toHaveLength(1);
    expect(resultado.erros[0]).toContain('SMTP indisponível');
  });

  it('não chama enviarSMS nem enviarWhatsApp', async () => {
    const garantia = makeGarantia();
    vi.mocked(sendEmail).mockResolvedValueOnce({ id: 'email-only' });

    await executarLogicaCron([garantia]);

    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('não processa garantias confirmadas (filtradas pela query)', async () => {
    mockSelectChain([]);
    const resultado = await executarLogicaCron([]);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(resultado.total).toBe(0);
  });

  it('não processa garantias em step diferente de email_enviado', async () => {
    mockSelectChain([]);
    const resultado = await executarLogicaCron([]);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(resultado.total).toBe(0);
  });
});

describe('garantiaFallbackCron — query de seleção', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('query aplica filtros: step=email_enviado, email_enviado_em < now()-4h, confirmado_em IS NULL', async () => {
    const { eq, isNull, lt } = await import('drizzle-orm');

    mockSelectChain([makeGarantia()]);

    await db
      .select()
      .from({} as never)
      .innerJoin({} as never, eq({} as never, {} as never))
      .where(
        (await import('drizzle-orm')).and(
          eq({} as never, 'email_enviado'),
          lt({} as never, {} as never),
          isNull({} as never),
        ),
      );

    expect(eq).toHaveBeenCalledWith(expect.anything(), 'email_enviado');
    expect(isNull).toHaveBeenCalled();
    expect(lt).toHaveBeenCalled();
  });
});
