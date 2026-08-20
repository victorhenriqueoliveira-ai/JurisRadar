import { describe, it, expect } from 'vitest';
import type {
  DjePublication,
  DjeEditionStatus,
  DjeSearchParams,
  DjeSearchResult,
  DjeSearchResponse,
  DjeSearch,
} from '../types';

// ── Verificação de named exports ──────────────────────────────────────────────

describe('types.ts — named exports', () => {
  it('exporta DjePublication como named export', async () => {
    const mod = await import('../types');
    // Interfaces TypeScript são apagadas em runtime; garantimos que o módulo existe
    expect(mod).toBeDefined();
    // O módulo deve ser importável sem erro — presença do tipo é validada pelo tsc
  });

  it('módulo src/lib/dje/types importa sem erro e é um objeto', async () => {
    const mod = await import('../types');
    expect(typeof mod).toBe('object');
  });
});

// ── Testes de conformidade de tipo em runtime ─────────────────────────────────

describe('DjePublication — conformidade de estrutura', () => {
  it('aceita instance "1"', () => {
    const pub: DjePublication = {
      processNumber: '0001234-56.2026.8.26.0100',
      instance: '1',
      court: 'Vara de Família',
      publicationDate: '2026-08-07',
      caderno: 3,
      content: 'Conteúdo da publicação',
    };
    expect(pub.instance).toBe('1');
    expect(pub.processNumber).toBe('0001234-56.2026.8.26.0100');
  });

  it('aceita instance "2"', () => {
    const pub: DjePublication = {
      processNumber: '0009876-54.2026.8.26.0100',
      instance: '2',
      court: null,
      publicationDate: '2026-08-07',
      caderno: 2,
      content: 'Conteúdo da publicação de segunda instância',
    };
    expect(pub.instance).toBe('2');
    expect(pub.court).toBeNull();
  });

  it('caderno aceita valor 2 ou 3', () => {
    const pub2: DjePublication = {
      processNumber: '0000001-11.2026.8.26.0100',
      instance: '2',
      court: null,
      publicationDate: '2026-01-01',
      caderno: 2,
      content: 'texto',
    };
    const pub3: DjePublication = {
      processNumber: '0000002-22.2026.8.26.0100',
      instance: '1',
      court: null,
      publicationDate: '2026-01-01',
      caderno: 3,
      content: 'texto',
    };
    expect(pub2.caderno).toBe(2);
    expect(pub3.caderno).toBe(3);
  });

  it('campo processNumber é obrigatório — objeto sem ele falha atribuição', () => {
    // Este teste valida que o campo existe e é string
    const pub: DjePublication = {
      processNumber: '0000001-11.2026.8.26.0100',
      instance: '1',
      court: null,
      publicationDate: '2026-01-01',
      caderno: 3,
      content: 'conteúdo',
    };
    expect(typeof pub.processNumber).toBe('string');
    expect(pub.processNumber.length).toBeGreaterThan(0);
  });
});

// ── DjeEditionStatus ──────────────────────────────────────────────────────────

describe('DjeEditionStatus — conformidade de estrutura', () => {
  it('aceita todos os status válidos', () => {
    const statuses: DjeEditionStatus['status'][] = [
      'pending',
      'downloading',
      'parsing',
      'completed',
      'failed',
    ];
    statuses.forEach((status) => {
      const edition: DjeEditionStatus = {
        editionDate: '2026-08-07',
        caderno: 2,
        status,
        publicationCount: null,
        errorMessage: null,
      };
      expect(edition.status).toBe(status);
    });
  });

  it('aceita publicationCount nulo', () => {
    const edition: DjeEditionStatus = {
      editionDate: '2026-08-07',
      caderno: 3,
      status: 'pending',
      publicationCount: null,
      errorMessage: null,
    };
    expect(edition.publicationCount).toBeNull();
  });

  it('aceita publicationCount numérico', () => {
    const edition: DjeEditionStatus = {
      editionDate: '2026-08-07',
      caderno: 3,
      status: 'completed',
      publicationCount: 1234,
      errorMessage: null,
    };
    expect(edition.publicationCount).toBe(1234);
  });
});

// ── DjeSearchParams ───────────────────────────────────────────────────────────

describe('DjeSearchParams — conformidade de estrutura', () => {
  it('dateFrom e dateTo seguem formato YYYY-MM-DD', () => {
    const params: DjeSearchParams = {
      term: 'execução fiscal',
      dateFrom: '2026-01-01',
      dateTo: '2026-08-07',
    };
    expect(params.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('term é string obrigatória', () => {
    const params: DjeSearchParams = {
      term: 'pensão alimentícia',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    };
    expect(typeof params.term).toBe('string');
  });
});

// ── DjeSearchResult ───────────────────────────────────────────────────────────

describe('DjeSearchResult — conformidade de estrutura', () => {
  it('snippet contém tags mark de destaque', () => {
    const result: DjeSearchResult = {
      id: 'uuid-1234',
      processNumber: '0001234-56.2026.8.26.0100',
      instance: '1',
      court: 'Vara de Família',
      publicationDate: '2026-08-07',
      caderno: 3,
      snippet: 'Processo de <mark>execução fiscal</mark> referente ao contribuinte.',
    };
    expect(result.snippet).toContain('<mark>');
    expect(result.snippet).toContain('</mark>');
  });

  it('court pode ser nulo', () => {
    const result: DjeSearchResult = {
      id: 'uuid-5678',
      processNumber: '0009876-54.2026.8.26.0100',
      instance: '2',
      court: null,
      publicationDate: '2026-08-07',
      caderno: 2,
      snippet: 'Trecho de <mark>alimentos</mark> provisionais.',
    };
    expect(result.court).toBeNull();
  });
});

// ── DjeSearchResponse ─────────────────────────────────────────────────────────

describe('DjeSearchResponse — conformidade de estrutura', () => {
  it('contém campos de paginação obrigatórios', () => {
    const response: DjeSearchResponse = {
      searchId: 'search-uuid-abc',
      results: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
    expect(response.page).toBe(1);
    expect(response.totalPages).toBe(0);
    expect(Array.isArray(response.results)).toBe(true);
  });
});

// ── DjeSearch ─────────────────────────────────────────────────────────────────

describe('DjeSearch — conformidade de estrutura', () => {
  it('name pode ser nulo', () => {
    const search: DjeSearch = {
      id: 'uuid-search',
      userId: 'uuid-user',
      name: null,
      term: 'alimentos',
      dateFrom: '2026-01-01',
      dateTo: '2026-08-07',
      totalResults: 42,
      executedAt: '2026-08-07T10:00:00Z',
      createdAt: '2026-08-07T10:00:00Z',
    };
    expect(search.name).toBeNull();
    expect(search.totalResults).toBe(42);
  });

  it('name pode ser string', () => {
    const search: DjeSearch = {
      id: 'uuid-search-2',
      userId: 'uuid-user',
      name: 'Busca mensal alimentos',
      term: 'alimentos',
      dateFrom: '2026-01-01',
      dateTo: '2026-08-07',
      totalResults: 10,
      executedAt: '2026-08-07T10:00:00Z',
      createdAt: '2026-08-07T10:00:00Z',
    };
    expect(typeof search.name).toBe('string');
  });
});
