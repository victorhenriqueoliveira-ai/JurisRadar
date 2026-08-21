/**
 * Testes unitários para src/lib/processos/upsert.ts
 *
 * Verifica:
 * - upsertProcesso insere novo processo quando não existe
 * - upsertProcesso atualiza processo existente sem criar duplicata
 * - insertMovimentacoesIdempotente chama onConflictDoNothing
 * - insertMovimentacoesIdempotente com lista vazia retorna 0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProcessoResult } from '@/lib/datajud/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'new-proc-id' }]),
};

const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};

const mockSelectExistingChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([{ id: 'existing-proc-id' }]),
};

const mockSelectEmptyChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  processos: {
    id: 'id',
    orgId: 'orgId',
    numeroCnj: 'numeroCnj',
    ultimaSyncAt: 'ultimaSyncAt',
    ultimaMovimentacao: 'ultimaMovimentacao',
  },
  movimentacoes: {
    id: 'id',
    orgId: 'orgId',
    processoId: 'processoId',
    data: 'data',
    descricao: 'descricao',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { db } from '@/db';
import { upsertProcesso, insertMovimentacoesIdempotente } from '../upsert';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProcesso(numero = '0001234-56.2026.8.26.0001'): ProcessoResult {
  return {
    numero,
    tribunal: 'TJSP',
    grau: 'G1',
    classe: 'Procedimento Comum',
    assunto: 'Responsabilidade Civil',
    ultimaMovimentacao: { data: '2026-01-01T10:00:00Z', descricao: 'Despacho inicial' },
    movimentos: [{ data: '2026-01-01T10:00:00Z', descricao: 'Despacho inicial' }],
  };
}

// ── Testes: upsertProcesso ────────────────────────────────────────────────────

describe('upsertProcesso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValue(mockInsertChain as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.update).mockReturnValue(mockUpdateChain as any);
  });

  it('insere novo processo quando não existe e retorna isNew=true', async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectEmptyChain as any);

    const result = await upsertProcesso({
      orgId: 'org-1',
      processo: makeProcesso(),
      fonteSync: ['datajud'],
    });

    expect(db.insert).toHaveBeenCalled();
    expect(result.isNew).toBe(true);
    expect(result.processoId).toBe('new-proc-id');
  });

  it('atualiza processo existente quando mesmo numero_cnj e retorna isNew=false', async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectExistingChain as any);

    const result = await upsertProcesso({
      orgId: 'org-1',
      processo: makeProcesso(),
      fonteSync: ['datajud'],
    });

    expect(db.update).toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(result.isNew).toBe(false);
    expect(result.processoId).toBe('existing-proc-id');
  });

  it('usa fonteSync padrão ["datajud"] quando não especificado', async () => {
    vi.mocked(db.select).mockReturnValue(mockSelectEmptyChain as any);

    await upsertProcesso({ orgId: 'org-1', processo: makeProcesso() });

    expect(mockInsertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ fonteSync: ['datajud'] }),
    );
  });
});

// ── Testes: insertMovimentacoesIdempotente ────────────────────────────────────

describe('insertMovimentacoesIdempotente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset returning mock para retornar array com 1 item por padrão
    mockInsertChain.returning.mockResolvedValue([{ id: 'mov-id' }]);
    vi.mocked(db.insert).mockReturnValue(mockInsertChain as any);
  });

  it('retorna 0 quando lista de movimentações é vazia', async () => {
    const count = await insertMovimentacoesIdempotente([]);
    expect(count).toBe(0);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('chama onConflictDoNothing para garantir idempotência', async () => {
    mockInsertChain.returning.mockResolvedValue([{ id: 'mov-1' }]);

    await insertMovimentacoesIdempotente([
      {
        processoId: 'proc-1',
        orgId: 'org-1',
        data: '2026-01-01T10:00:00Z',
        descricao: 'Despacho',
        externoId: 'ext-1',
      },
    ]);

    expect(mockInsertChain.onConflictDoNothing).toHaveBeenCalled();
  });

  it('retorna contagem de inserções bem-sucedidas', async () => {
    mockInsertChain.returning.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const count = await insertMovimentacoesIdempotente([
      { processoId: 'p', orgId: 'o', data: '2026-01-01T10:00:00Z', descricao: 'Mov 1', externoId: 'e1' },
      { processoId: 'p', orgId: 'o', data: '2026-01-02T10:00:00Z', descricao: 'Mov 2', externoId: 'e2' },
    ]);

    expect(count).toBe(2);
  });

  it('movimentação duplicada (mesmo externoId) não lança erro graças ao onConflictDoNothing', async () => {
    // onConflictDoNothing retorna array vazio (conflito — não inseriu)
    mockInsertChain.returning.mockResolvedValue([]);

    const count = await insertMovimentacoesIdempotente([
      { processoId: 'p', orgId: 'o', data: '2026-01-01T10:00:00Z', descricao: 'Mov', externoId: 'dup-id' },
    ]);

    // Não lançou erro e retornou 0 (sem inserção por conflito)
    expect(count).toBe(0);
  });
});
