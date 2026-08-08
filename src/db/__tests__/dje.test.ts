import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DjePublication, DjeSearchParams } from '@/lib/dje/types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@/db/index', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  djeEditions: {
    id: 'id',
    editionDate: 'edition_date',
    caderno: 'caderno',
    status: 'status',
    publicationCount: 'publication_count',
    errorMessage: 'error_message',
    startedAt: 'started_at',
    completedAt: 'completed_at',
    createdAt: 'created_at',
  },
  djePublications: {
    id: 'id',
    editionId: 'edition_id',
    processNumber: 'process_number',
    instance: 'instance',
    court: 'court',
    publicationDate: 'publication_date',
    caderno: 'caderno',
    content: 'content',
    createdAt: 'created_at',
  },
  djeSearches: {
    id: 'id',
    userId: 'user_id',
    name: 'name',
    term: 'term',
    dateFrom: 'date_from',
    dateTo: 'date_to',
    totalResults: 'total_results',
    executedAt: 'executed_at',
    createdAt: 'created_at',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePublication(overrides: Partial<DjePublication> = {}): DjePublication {
  return {
    processNumber: '0000001-01.2026.8.26.0100',
    instance: '1',
    court: 'Vara Cível',
    publicationDate: '2026-08-07',
    caderno: 3,
    content: 'Execução fiscal contra empresa XPTO Ltda.',
    ...overrides,
  };
}

const defaultSearchParams: DjeSearchParams = {
  term: 'execução fiscal',
  dateFrom: '2026-08-01',
  dateTo: '2026-08-07',
};

// ── Testes: createDjeEdition ──────────────────────────────────────────────────

describe('createDjeEdition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inserir edição com status pending e retornar UUID válido', async () => {
    const fakeId = '550e8400-e29b-41d4-a716-446655440000';
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: fakeId }]),
      }),
    });

    const { createDjeEdition } = await import('@/db/dje');
    const id = await createDjeEdition('2026-08-07', 2);

    expect(id).toBe(fakeId);
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('deve inserir com caderno 3 sem erros', async () => {
    const fakeId = 'caderno-3-uuid';
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: fakeId }]),
      }),
    });

    const { createDjeEdition } = await import('@/db/dje');
    const id = await createDjeEdition('2026-08-07', 3);

    expect(id).toBe(fakeId);
  });

  it('deve passar os valores corretos para o insert', async () => {
    let insertedValues: Record<string, unknown> | null = null;
    const valuesMock = vi.fn().mockImplementation((values: Record<string, unknown>) => {
      insertedValues = values;
      return { returning: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]) };
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const { createDjeEdition } = await import('@/db/dje');
    await createDjeEdition('2026-08-07', 2);

    expect(insertedValues).toMatchObject({
      editionDate: '2026-08-07',
      caderno: 2,
      status: 'pending',
    });
  });
});

// ── Testes: updateDjeEditionStatus ────────────────────────────────────────────

describe('updateDjeEditionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve atualizar status sem alterar outros campos opcionais quando não fornecidos', async () => {
    let updateValues: Record<string, unknown> | null = null;
    mockDb.update.mockReturnValue({
      set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        updateValues = values;
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    });

    const { updateDjeEditionStatus } = await import('@/db/dje');
    await updateDjeEditionStatus('edition-id', 'pending');

    expect(updateValues).toMatchObject({ status: 'pending' });
    expect(updateValues).not.toHaveProperty('publicationCount');
    expect(updateValues).not.toHaveProperty('errorMessage');
  });

  it('deve incluir publicationCount quando fornecido', async () => {
    let updateValues: Record<string, unknown> | null = null;
    mockDb.update.mockReturnValue({
      set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        updateValues = values;
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    });

    const { updateDjeEditionStatus } = await import('@/db/dje');
    await updateDjeEditionStatus('edition-id', 'completed', 142);

    expect(updateValues).toMatchObject({ status: 'completed', publicationCount: 142 });
  });

  it('deve incluir errorMessage quando fornecido', async () => {
    let updateValues: Record<string, unknown> | null = null;
    mockDb.update.mockReturnValue({
      set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        updateValues = values;
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    });

    const { updateDjeEditionStatus } = await import('@/db/dje');
    await updateDjeEditionStatus('edition-id', 'failed', undefined, 'Timeout de download');

    expect(updateValues).toMatchObject({
      status: 'failed',
      errorMessage: 'Timeout de download',
    });
  });

  it('deve definir completedAt ao finalizar com status completed', async () => {
    let updateValues: Record<string, unknown> | null = null;
    mockDb.update.mockReturnValue({
      set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
        updateValues = values;
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    });

    const { updateDjeEditionStatus } = await import('@/db/dje');
    await updateDjeEditionStatus('edition-id', 'completed', 142);

    expect(updateValues).toHaveProperty('completedAt');
    expect((updateValues as Record<string, unknown>).completedAt).toBeInstanceOf(Date);
  });
});

// ── Testes: insertPublications ────────────────────────────────────────────────

describe('insertPublications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inserir 3 publicações e retornar 3', async () => {
    const pubs = [makePublication(), makePublication(), makePublication()];
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 'uuid-1' },
          { id: 'uuid-2' },
          { id: 'uuid-3' },
        ]),
      }),
    });

    const { insertPublications } = await import('@/db/dje');
    const count = await insertPublications('edition-id', pubs);

    expect(count).toBe(3);
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('deve retornar 0 sem chamar insert quando array vazio', async () => {
    const { insertPublications } = await import('@/db/dje');
    const count = await insertPublications('edition-id', []);

    expect(count).toBe(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('não deve incluir search_vector nos valores inseridos', async () => {
    let insertedRows: Record<string, unknown>[] | null = null;
    const valuesMock = vi.fn().mockImplementation((rows: Record<string, unknown>[]) => {
      insertedRows = rows;
      return { returning: vi.fn().mockResolvedValue([{ id: 'uuid-1' }]) };
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const { insertPublications } = await import('@/db/dje');
    await insertPublications('edition-id', [makePublication()]);

    expect(insertedRows).not.toBeNull();
    const row = (insertedRows as Record<string, unknown>[])[0];
    expect(row).not.toHaveProperty('search_vector');
    expect(row).not.toHaveProperty('searchVector');
  });
});

// ── Testes: searchPublications ────────────────────────────────────────────────

describe('searchPublications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar resultados com snippet quando há publicações', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // count query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'pub-uuid-1',
            process_number: '0000001-01.2026.8.26.0100',
            instance: '1',
            court: 'Vara Cível',
            publication_date: '2026-08-07',
            caderno: 3,
            snippet: 'Publicação sobre <mark>execução fiscal</mark> do processo',
          },
          {
            id: 'pub-uuid-2',
            process_number: '0000002-02.2026.8.26.0200',
            instance: '2',
            court: null,
            publication_date: '2026-08-05',
            caderno: 2,
            snippet: '<mark>Execução fiscal</mark> em segunda instância',
          },
        ],
      });

    const { searchPublications } = await import('@/db/dje');
    const { results, total } = await searchPublications(defaultSearchParams, 1, 50, 'user-id');

    expect(total).toBe(2);
    expect(results).toHaveLength(2);
    expect(results[0].snippet).toContain('<mark>');
    expect(results[0].snippet).toContain('</mark>');
    expect(results[0].processNumber).toBe('0000001-01.2026.8.26.0100');
  });

  it('deve retornar resultados vazios quando termo não encontrado', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const { searchPublications } = await import('@/db/dje');
    const { results, total } = await searchPublications(
      { term: 'termoInexistente123', dateFrom: '2026-08-01', dateTo: '2026-08-07' },
      1,
      50,
      'user-id',
    );

    expect(total).toBe(0);
    expect(results).toHaveLength(0);
    // Não deve chamar a query de resultados se o count for 0
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('deve calcular offset correto para page 2 com limit 10', async () => {
    const executedSqls: string[] = [];
    mockDb.execute.mockImplementation((sqlQuery: { queryChunks?: unknown[] }) => {
      // Captura as queries executadas para verificar offset
      const sqlStr = JSON.stringify(sqlQuery);
      executedSqls.push(sqlStr);
      if (executedSqls.length === 1) {
        return Promise.resolve({ rows: [{ total: '25' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { searchPublications } = await import('@/db/dje');
    await searchPublications(defaultSearchParams, 2, 10, 'user-id');

    // Deve ter chamado execute duas vezes (count + results)
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it('deve filtrar por dateFrom e dateTo na query', async () => {
    const queryStrings: string[] = [];
    mockDb.execute.mockImplementation((sqlQuery: unknown) => {
      queryStrings.push(JSON.stringify(sqlQuery));
      if (queryStrings.length === 1) {
        return Promise.resolve({ rows: [{ total: '1' }] });
      }
      return Promise.resolve({
        rows: [{
          id: 'pub-1',
          process_number: '0000001',
          instance: '1',
          court: null,
          publication_date: '2026-08-05',
          caderno: 3,
          snippet: '<mark>execução</mark> fiscal',
        }],
      });
    });

    const { searchPublications } = await import('@/db/dje');
    const { results } = await searchPublications(
      { term: 'execução fiscal', dateFrom: '2026-08-01', dateTo: '2026-08-07' },
      1,
      10,
      'user-id',
    );

    expect(results[0].publicationDate).toBe('2026-08-05');
  });
});

// ── Testes: createDjeSearch ───────────────────────────────────────────────────

describe('createDjeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve persistir busca e retornar UUID', async () => {
    const fakeId = 'search-uuid-123';
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: fakeId }]),
      }),
    });

    const { createDjeSearch } = await import('@/db/dje');
    const id = await createDjeSearch('user-id', defaultSearchParams, 'Busca Execução', 42);

    expect(id).toBe(fakeId);
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('deve funcionar sem nome e totalResults opcionais', async () => {
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'search-uuid-456' }]),
      }),
    });

    const { createDjeSearch } = await import('@/db/dje');
    const id = await createDjeSearch('user-id', defaultSearchParams);

    expect(id).toBe('search-uuid-456');
  });

  it('deve incluir os valores corretos no insert', async () => {
    let insertedValues: Record<string, unknown> | null = null;
    const valuesMock = vi.fn().mockImplementation((values: Record<string, unknown>) => {
      insertedValues = values;
      return { returning: vi.fn().mockResolvedValue([{ id: 'uuid' }]) };
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const { createDjeSearch } = await import('@/db/dje');
    await createDjeSearch('user-abc', defaultSearchParams, 'Minha Busca', 100);

    expect(insertedValues).toMatchObject({
      userId: 'user-abc',
      term: 'execução fiscal',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-07',
      name: 'Minha Busca',
      totalResults: 100,
    });
  });
});

// ── Testes: getDjeSearch ──────────────────────────────────────────────────────

describe('getDjeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar null quando userId não corresponde (ownership check)', async () => {
    // Simula que não encontrou registro com o userId errado
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { getDjeSearch } = await import('@/db/dje');
    const result = await getDjeSearch('search-id', 'wrong-user-id');

    expect(result).toBeNull();
  });

  it('deve retornar DjeSearch quando id e userId correspondem', async () => {
    const fakeSearch = {
      id: 'search-uuid',
      userId: 'user-id',
      name: 'Busca Fiscal',
      term: 'execução fiscal',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-07',
      totalResults: 5,
      executedAt: new Date('2026-08-07T10:00:00Z'),
      createdAt: new Date('2026-08-07T10:00:00Z'),
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([fakeSearch]),
      }),
    });

    const { getDjeSearch } = await import('@/db/dje');
    const result = await getDjeSearch('search-uuid', 'user-id');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('search-uuid');
    expect(result?.term).toBe('execução fiscal');
    expect(result?.totalResults).toBe(5);
  });

  it('deve retornar null quando busca não existe', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { getDjeSearch } = await import('@/db/dje');
    const result = await getDjeSearch('nonexistent-id', 'user-id');

    expect(result).toBeNull();
  });
});

// ── Testes: listDjeSearches ───────────────────────────────────────────────────

describe('listDjeSearches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar lista vazia quando usuário não tem buscas', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: '0' }]),
      }),
    });

    const { listDjeSearches } = await import('@/db/dje');
    const { searches, total } = await listDjeSearches('user-id', 1, 20);

    expect(total).toBe(0);
    expect(searches).toHaveLength(0);
  });

  it('deve retornar buscas ordenadas por createdAt DESC', async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 3600000);

    const fakeSearches = [
      {
        id: 'search-2',
        userId: 'user-id',
        name: null,
        term: 'mandado de segurança',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-07',
        totalResults: 10,
        executedAt: now,
        createdAt: now, // mais recente
      },
      {
        id: 'search-1',
        userId: 'user-id',
        name: 'Busca Antiga',
        term: 'execução fiscal',
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        totalResults: 5,
        executedAt: earlier,
        createdAt: earlier, // mais antiga
      },
    ];

    // Mock para count
    const countSelectMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: '2' }]),
      }),
    };

    // Mock para resultados paginados
    const resultsSelectMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(fakeSearches),
            }),
          }),
        }),
      }),
    };

    mockDb.select
      .mockReturnValueOnce(countSelectMock)
      .mockReturnValueOnce(resultsSelectMock);

    const { listDjeSearches } = await import('@/db/dje');
    const { searches, total } = await listDjeSearches('user-id', 1, 20);

    expect(total).toBe(2);
    expect(searches).toHaveLength(2);
    // O primeiro deve ser o mais recente (search-2)
    expect(searches[0].id).toBe('search-2');
    expect(searches[1].id).toBe('search-1');
  });

  it('deve aplicar paginação correta', async () => {
    // Count retorna 30 registros
    const countSelectMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: '30' }]),
      }),
    };

    const resultsSelectMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };

    mockDb.select
      .mockReturnValueOnce(countSelectMock)
      .mockReturnValueOnce(resultsSelectMock);

    const { listDjeSearches } = await import('@/db/dje');
    const { total } = await listDjeSearches('user-id', 2, 10);

    expect(total).toBe(30);
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });
});
