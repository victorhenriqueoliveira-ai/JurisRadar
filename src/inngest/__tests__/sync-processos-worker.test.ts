/**
 * Testes unitários para syncProcessosWorker.
 *
 * Verifica:
 * - Worker com mock DataJud retornando 3 processos insere 3 registros
 * - Worker com DataJudRateLimitError não lança exceção (não atualiza ultima_sync_at indiretamente)
 * - Worker sem OAB retorna status 'skipped'
 * - Movimentações são inseridas via insertMovimentacoesIdempotente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProcessoResult } from '@/lib/datajud/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/datajud/client', () => ({
  queryTribunal: vi.fn(),
}));

vi.mock('@/lib/datajud/tribunals', () => ({
  DATAJUD_TRIBUNALS: ['api_publica_tjsp', 'api_publica_tjrj'],
}));

vi.mock('@/lib/processos/upsert', () => ({
  upsertProcesso: vi.fn(),
  insertMovimentacoesIdempotente: vi.fn(),
}));

vi.mock('@/inngest/notificacao-dispatcher', () => ({
  TIPOS_RELEVANTES: ['nova_movimentacao', 'prazo_critico'],
  novaNotificacao: vi.fn(),
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { queryTribunal } from '@/lib/datajud/client';
import { DataJudRateLimitError } from '@/lib/datajud/types';
import { upsertProcesso, insertMovimentacoesIdempotente } from '@/lib/processos/upsert';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProcesso(i: number): ProcessoResult {
  return {
    numero: `000${i}-00.2026.8.26.0001`,
    tribunal: 'TJSP',
    grau: 'G1',
    classe: 'Procedimento Comum',
    assunto: 'Responsabilidade Civil',
    movimentos: [
      { data: `2026-01-0${i}T10:00:00Z`, descricao: `Movimentação ${i}` },
    ],
    ultimaMovimentacao: { data: `2026-01-0${i}T10:00:00Z`, descricao: `Movimentação ${i}` },
  };
}

const FAKE_EVENT = {
  data: {
    userId: 'user-1',
    orgId: 'org-1',
    oabNumero: '123456',
    oabEstado: 'SP',
  },
};

const FAKE_EVENT_SEM_OAB = {
  data: {
    userId: 'user-1',
    orgId: 'org-1',
    oabNumero: null,
    oabEstado: null,
  },
};

// ── Helper: extrai e executa o handler do syncProcessosWorker ─────────────────

async function runWorker(event: typeof FAKE_EVENT | typeof FAKE_EVENT_SEM_OAB) {
  const { syncProcessosWorker } = await import('../sync-processos-worker');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (syncProcessosWorker as any)['_fn'] ?? (syncProcessosWorker as any)['fn'];

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

// ── Testes ────────────────────────────────────────────────────────────────────

describe('syncProcessosWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Default: upsert retorna processoId
    vi.mocked(upsertProcesso).mockResolvedValue({ processoId: 'proc-id', isNew: true });
    vi.mocked(insertMovimentacoesIdempotente).mockResolvedValue(1);
  });

  it('com mock DataJud retornando 3 processos, chama upsertProcesso 3 vezes', async () => {
    // TJSP retorna 3 processos, TJRJ retorna 0
    vi.mocked(queryTribunal)
      .mockResolvedValueOnce({ hits: [makeProcesso(1), makeProcesso(2), makeProcesso(3)], total: 3 })
      .mockResolvedValueOnce({ hits: [], total: 0 });

    await runWorker(FAKE_EVENT);

    expect(upsertProcesso).toHaveBeenCalledTimes(3);
    expect(upsertProcesso).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', fonteSync: ['datajud'] }),
    );
  });

  it('insere movimentações para cada processo encontrado', async () => {
    vi.mocked(queryTribunal)
      .mockResolvedValueOnce({ hits: [makeProcesso(1)], total: 1 })
      .mockResolvedValueOnce({ hits: [], total: 0 });

    await runWorker(FAKE_EVENT);

    expect(insertMovimentacoesIdempotente).toHaveBeenCalledTimes(1);
    expect(insertMovimentacoesIdempotente).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          processoId: 'proc-id',
          orgId: 'org-1',
          fonte: 'datajud',
        }),
      ]),
    );
  });

  it('com DataJudRateLimitError, não lança exceção e continua para próximo tribunal', async () => {
    // TJSP lança rate limit, TJRJ retorna 1 processo
    vi.mocked(queryTribunal)
      .mockRejectedValueOnce(new DataJudRateLimitError(60))
      .mockResolvedValueOnce({ hits: [makeProcesso(1)], total: 1 });

    const { result } = await runWorker(FAKE_EVENT);

    // Não deve lançar exceção
    expect(result).toMatchObject({ status: 'completed' });
    // Worker deve ter processado o processo do TJRJ
    expect(upsertProcesso).toHaveBeenCalledTimes(1);
  });

  it('sem OAB, retorna status skipped sem consultar DataJud', async () => {
    const { result } = await runWorker(FAKE_EVENT_SEM_OAB);

    expect(result).toMatchObject({ status: 'skipped', reason: 'sem_oab' });
    expect(queryTribunal).not.toHaveBeenCalled();
    expect(upsertProcesso).not.toHaveBeenCalled();
  });

  it('quando DataJud retorna 0 processos, retorna processosSincronizados=0', async () => {
    vi.mocked(queryTribunal).mockResolvedValue({ hits: [], total: 0 });

    const { result } = await runWorker(FAKE_EVENT);

    expect(result).toMatchObject({ status: 'completed', processosSincronizados: 0 });
    expect(upsertProcesso).not.toHaveBeenCalled();
  });

  it('falha ao persistir um processo não propaga e continua para o próximo', async () => {
    vi.mocked(queryTribunal)
      .mockResolvedValueOnce({ hits: [makeProcesso(1), makeProcesso(2)], total: 2 })
      .mockResolvedValueOnce({ hits: [], total: 0 });

    // Primeiro upsert falha, segundo sucede
    vi.mocked(upsertProcesso)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({ processoId: 'proc-2', isNew: true });

    const { result } = await runWorker(FAKE_EVENT);

    // Não deve lançar exceção
    expect(result).toMatchObject({ status: 'completed' });
    // Apenas 1 processo foi sincronizado (o segundo)
    expect((result as { processosSincronizados: number }).processosSincronizados).toBe(1);
  });
});
