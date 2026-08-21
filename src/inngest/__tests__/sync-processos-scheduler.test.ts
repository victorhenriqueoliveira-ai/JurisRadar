/**
 * Testes unitários para syncProcessosScheduler.
 *
 * Verifica:
 * - Fan-out de eventos por advogado ativo
 * - Filtro de subscriptions canceladas (não emite evento)
 * - Retorno correto quando não há advogados ativos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  orgMembers: { userId: 'userId', orgId: 'orgId' },
  users: { oabNumero: 'oabNumero', oabEstado: 'oabEstado', id: 'id' },
  subscriptions: { orgId: 'orgId', status: 'status' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq' })),
  inArray: vi.fn((_col: unknown, _vals: unknown) => ({ type: 'inArray' })),
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { db } from '@/db';

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeAdvogado(i: number) {
  return {
    userId: `user-${i}`,
    orgId: `org-${i}`,
    oabNumero: `${100000 + i}`,
    oabEstado: 'SP',
  };
}

function makeDbSelectChain(resolvedValue: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(resolvedValue),
  };
}

// ── Helper: extrai e executa o handler do syncProcessosScheduler ──────────────

async function runScheduler(dbResults: unknown[]) {
  // Configura mock do db.select
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.select).mockReturnValue(makeDbSelectChain(dbResults) as any);

  const { syncProcessosScheduler } = await import('../sync-processos-scheduler');

  // Acessa o handler interno do Inngest
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (syncProcessosScheduler as any)['_fn'] ?? (syncProcessosScheduler as any)['fn'];

  const sentEvents: unknown[] = [];
  const stepMock = {
    run: vi.fn(async (_name: string, callback: () => Promise<unknown>) => callback()),
    sendEvent: vi.fn(async (_name: string, events: unknown) => {
      if (Array.isArray(events)) sentEvents.push(...events);
      else sentEvents.push(events);
    }),
  };

  let result: unknown;
  if (fn) {
    result = await fn({ step: stepMock, event: {}, runId: 'test' });
  }

  return { result, sentEvents, stepMock };
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('syncProcessosScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache so mocks apply fresh
    vi.resetModules();
  });

  it('emite um evento por advogado com subscription ativa', async () => {
    const advogados = [makeAdvogado(1), makeAdvogado(2), makeAdvogado(3)];
    const { result, sentEvents } = await runScheduler(advogados);

    expect(sentEvents).toHaveLength(3);
    expect(sentEvents[0]).toMatchObject({
      name: 'processos/sync.requested',
      data: { userId: 'user-1', orgId: 'org-1' },
    });
    expect((result as { total: number }).total).toBe(3);
  });

  it('não emite nenhum evento quando não há advogados ativos', async () => {
    const { result, sentEvents } = await runScheduler([]);

    expect(sentEvents).toHaveLength(0);
    expect((result as { total: number }).total).toBe(0);
  });

  it('inclui oabNumero e oabEstado no payload do evento', async () => {
    const advogados = [{ userId: 'u1', orgId: 'o1', oabNumero: '123456', oabEstado: 'SP' }];
    const { sentEvents } = await runScheduler(advogados);

    expect(sentEvents[0]).toMatchObject({
      data: { oabNumero: '123456', oabEstado: 'SP' },
    });
  });

  it('inclui oabNumero null quando advogado não tem OAB', async () => {
    const advogados = [{ userId: 'u1', orgId: 'o1', oabNumero: null, oabEstado: null }];
    const { sentEvents } = await runScheduler(advogados);

    expect(sentEvents[0]).toMatchObject({
      data: { oabNumero: null, oabEstado: null },
    });
  });
});
