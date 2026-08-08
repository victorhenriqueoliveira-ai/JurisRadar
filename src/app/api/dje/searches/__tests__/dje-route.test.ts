import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { DjeSearch, DjeSearchResult } from '@/lib/dje/types';

// ── Mocks globais ─────────────────────────────────────────────────────────────

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db/dje', () => ({
  searchPublications: vi.fn(),
  createDjeSearch: vi.fn(),
  getDjeSearch: vi.fn(),
  listDjeSearches: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDjeSearch(overrides: Partial<DjeSearch> = {}): DjeSearch {
  return {
    id: 'search-uuid-1',
    userId: 'user-id-1',
    name: null,
    term: 'execução fiscal',
    dateFrom: '2026-07-01',
    dateTo: '2026-08-07',
    totalResults: 5,
    executedAt: '2026-08-07T10:00:00.000Z',
    createdAt: '2026-08-07T10:00:00.000Z',
    ...overrides,
  };
}

function makeDjeSearchResult(overrides: Partial<DjeSearchResult> = {}): DjeSearchResult {
  return {
    id: 'pub-uuid-1',
    processNumber: '0000001-01.2026.8.26.0100',
    instance: '1',
    court: 'Vara Cível Central',
    publicationDate: '2026-08-07',
    caderno: 3,
    snippet: 'Publicação sobre <mark>execução fiscal</mark> do processo',
    ...overrides,
  };
}

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Importações dos handlers (lazy para que mocks sejam aplicados) ─────────────

async function getHandlers() {
  const { POST: postSearches, GET: getSearches } = await import(
    '../route'
  );
  const { GET: getSearchById } = await import(
    '../[id]/route'
  );
  const { POST: postRerun } = await import('../[id]/rerun/route');
  const { GET: getExport } = await import('../[id]/export/route');
  return { postSearches, getSearches, getSearchById, postRerun, getExport };
}

// ── Testes: POST /api/dje/searches ────────────────────────────────────────────

describe('POST /api/dje/searches', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import('@/auth');
    const { searchPublications, createDjeSearch } = await import('@/db/dje');
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-id-1' } } as Parameters<typeof vi.mocked<typeof auth>>[0] extends undefined ? never : Awaited<ReturnType<typeof auth>>);
    vi.mocked(searchPublications).mockResolvedValue({
      results: [makeDjeSearchResult()],
      total: 1,
    });
    vi.mocked(createDjeSearch).mockResolvedValue('new-search-uuid');
  });

  it('deve retornar 401 quando não há sessão', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const { postSearches } = await getHandlers();
    const req = makeRequest('POST', 'http://localhost/api/dje/searches', {
      term: 'execução fiscal',
      dateFrom: '2026-07-01',
      dateTo: '2026-08-07',
    });
    const res = await postSearches(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('deve retornar 422 quando term tem menos de 2 caracteres', async () => {
    const { postSearches } = await getHandlers();
    const req = makeRequest('POST', 'http://localhost/api/dje/searches', {
      term: 'a',
      dateFrom: '2026-07-01',
      dateTo: '2026-08-07',
    });
    const res = await postSearches(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('deve retornar 422 quando dateTo é anterior a dateFrom', async () => {
    const { postSearches } = await getHandlers();
    const req = makeRequest('POST', 'http://localhost/api/dje/searches', {
      term: 'execução fiscal',
      dateFrom: '2026-08-07',
      dateTo: '2026-08-01',
    });
    const res = await postSearches(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('deve retornar 201 com searchId e results quando dados são válidos', async () => {
    const { postSearches } = await getHandlers();
    const req = makeRequest('POST', 'http://localhost/api/dje/searches', {
      term: 'execução fiscal',
      dateFrom: '2026-07-01',
      dateTo: '2026-08-07',
    });
    const res = await postSearches(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.searchId).toBe('new-search-uuid');
    expect(json.results).toHaveLength(1);
    expect(json.total).toBe(1);
    expect(json.page).toBe(1);
    expect(json.totalPages).toBe(1);
  });

  it('deve persistir entrada em dje_searches com total_results correto', async () => {
    const { searchPublications, createDjeSearch } = await import('@/db/dje');
    vi.mocked(searchPublications).mockResolvedValue({
      results: [makeDjeSearchResult(), makeDjeSearchResult({ id: 'pub-2' })],
      total: 42,
    });

    const { postSearches } = await getHandlers();
    const req = makeRequest('POST', 'http://localhost/api/dje/searches', {
      term: 'mandado de segurança',
      dateFrom: '2026-07-01',
      dateTo: '2026-08-07',
    });
    await postSearches(req);

    expect(vi.mocked(createDjeSearch)).toHaveBeenCalledWith(
      'user-id-1',
      expect.objectContaining({ term: 'mandado de segurança' }),
      undefined,
      42,
    );
  });

  it('deve retornar 422 quando body é JSON inválido', async () => {
    const { postSearches } = await getHandlers();
    const req = new NextRequest('http://localhost/api/dje/searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await postSearches(req);

    expect(res.status).toBe(422);
  });
});

// ── Testes: GET /api/dje/searches ─────────────────────────────────────────────

describe('GET /api/dje/searches', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import('@/auth');
    const { listDjeSearches } = await import('@/db/dje');
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-id-1' } } as Parameters<typeof vi.mocked<typeof auth>>[0] extends undefined ? never : Awaited<ReturnType<typeof auth>>);
    vi.mocked(listDjeSearches).mockResolvedValue({
      searches: [makeDjeSearch()],
      total: 1,
    });
  });

  it('deve retornar 401 quando não há sessão', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const { getSearches } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches');
    const res = await getSearches(req);

    expect(res.status).toBe(401);
  });

  it('deve retornar apenas buscas do usuário autenticado', async () => {
    const { listDjeSearches } = await import('@/db/dje');
    vi.mocked(listDjeSearches).mockResolvedValue({
      searches: [makeDjeSearch({ userId: 'user-id-1' })],
      total: 1,
    });

    const { getSearches } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches');
    const res = await getSearches(req);

    expect(res.status).toBe(200);
    // Verifica que foi chamada com o userId correto do usuário autenticado
    expect(vi.mocked(listDjeSearches)).toHaveBeenCalledWith('user-id-1', 1, 20);
    const json = await res.json();
    expect(json.searches).toHaveLength(1);
    expect(json.total).toBe(1);
  });

  it('deve respeitar parâmetros de paginação da query string', async () => {
    const { listDjeSearches } = await import('@/db/dje');

    const { getSearches } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches?page=2&limit=10');
    await getSearches(req);

    expect(vi.mocked(listDjeSearches)).toHaveBeenCalledWith('user-id-1', 2, 10);
  });
});

// ── Testes: GET /api/dje/searches/[id] ────────────────────────────────────────

describe('GET /api/dje/searches/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import('@/auth');
    const { getDjeSearch, searchPublications } = await import('@/db/dje');
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-id-1' } } as Parameters<typeof vi.mocked<typeof auth>>[0] extends undefined ? never : Awaited<ReturnType<typeof auth>>);
    vi.mocked(getDjeSearch).mockResolvedValue(makeDjeSearch());
    vi.mocked(searchPublications).mockResolvedValue({
      results: [makeDjeSearchResult()],
      total: 1,
    });
  });

  it('deve retornar 401 quando não há sessão', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const { getSearchById } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/search-uuid-1');
    const res = await getSearchById(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    expect(res.status).toBe(401);
  });

  it('deve retornar 404 quando busca pertence a outro usuário', async () => {
    const { getDjeSearch } = await import('@/db/dje');
    // getDjeSearch retorna null quando userId não corresponde
    vi.mocked(getDjeSearch).mockResolvedValue(null);

    const { getSearchById } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/other-user-search');
    const res = await getSearchById(req, { params: Promise.resolve({ id: 'other-user-search' }) });

    expect(res.status).toBe(404);
  });

  it('deve re-executar query com page e limit corretos quando paginação é especificada', async () => {
    const { searchPublications } = await import('@/db/dje');

    const { getSearchById } = await getHandlers();
    const req = makeRequest(
      'GET',
      'http://localhost/api/dje/searches/search-uuid-1?page=2&limit=10',
    );
    const res = await getSearchById(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    expect(res.status).toBe(200);
    expect(vi.mocked(searchPublications)).toHaveBeenCalledWith(
      expect.objectContaining({ term: 'execução fiscal' }),
      2,
      10,
      'user-id-1',
    );
  });

  it('deve retornar search, results, total, page e totalPages em 200', async () => {
    const { getSearchById } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/search-uuid-1');
    const res = await getSearchById(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.search).toBeTruthy();
    expect(json.results).toHaveLength(1);
    expect(json.total).toBe(1);
    expect(json.page).toBe(1);
    expect(json.totalPages).toBe(1);
  });
});

// ── Testes: POST /api/dje/searches/[id]/rerun ─────────────────────────────────

describe('POST /api/dje/searches/[id]/rerun', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import('@/auth');
    const { getDjeSearch, searchPublications, createDjeSearch } = await import('@/db/dje');
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-id-1' } } as Parameters<typeof vi.mocked<typeof auth>>[0] extends undefined ? never : Awaited<ReturnType<typeof auth>>);
    vi.mocked(getDjeSearch).mockResolvedValue(makeDjeSearch({ id: 'search-uuid-1' }));
    vi.mocked(searchPublications).mockResolvedValue({ results: [], total: 7 });
    vi.mocked(createDjeSearch).mockResolvedValue('new-search-uuid-2');
  });

  it('deve retornar 401 quando não há sessão', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const { postRerun } = await getHandlers();
    const req = makeRequest('POST', 'http://localhost/api/dje/searches/search-uuid-1/rerun');
    const res = await postRerun(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    expect(res.status).toBe(401);
  });

  it('deve retornar 404 quando busca não pertence ao usuário', async () => {
    const { getDjeSearch } = await import('@/db/dje');
    vi.mocked(getDjeSearch).mockResolvedValue(null);

    const { postRerun } = await getHandlers();
    const req = makeRequest('POST', 'http://localhost/api/dje/searches/other-search/rerun');
    const res = await postRerun(req, { params: Promise.resolve({ id: 'other-search' }) });

    expect(res.status).toBe(404);
  });

  it('deve criar nova dje_search com mesmo term e retornar 201 com novo searchId', async () => {
    const { createDjeSearch } = await import('@/db/dje');

    const { postRerun } = await getHandlers();
    const req = makeRequest('POST', 'http://localhost/api/dje/searches/search-uuid-1/rerun');
    const res = await postRerun(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.searchId).toBe('new-search-uuid-2');
    // Novo searchId deve ser diferente do original
    expect(json.searchId).not.toBe('search-uuid-1');

    // Deve ter criado com o mesmo term
    expect(vi.mocked(createDjeSearch)).toHaveBeenCalledWith(
      'user-id-1',
      expect.objectContaining({ term: 'execução fiscal' }),
      undefined,
      7,
    );
  });
});

// ── Testes: GET /api/dje/searches/[id]/export ─────────────────────────────────

describe('GET /api/dje/searches/[id]/export', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import('@/auth');
    const { getDjeSearch, searchPublications } = await import('@/db/dje');
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-id-1' } } as Parameters<typeof vi.mocked<typeof auth>>[0] extends undefined ? never : Awaited<ReturnType<typeof auth>>);
    vi.mocked(getDjeSearch).mockResolvedValue(makeDjeSearch());
    vi.mocked(searchPublications).mockResolvedValue({
      results: [
        makeDjeSearchResult(),
        makeDjeSearchResult({
          id: 'pub-2',
          processNumber: '0000002-02.2026.8.26.0200',
          court: null,
          snippet: 'Processo sem vara definida sobre <mark>execução</mark>',
        }),
      ],
      total: 2,
    });
  });

  it('deve retornar 401 quando não há sessão', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const { getExport } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/search-uuid-1/export');
    const res = await getExport(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    expect(res.status).toBe(401);
  });

  it('deve retornar 404 quando busca não pertence ao usuário', async () => {
    const { getDjeSearch } = await import('@/db/dje');
    vi.mocked(getDjeSearch).mockResolvedValue(null);

    const { getExport } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/other-search/export');
    const res = await getExport(req, { params: Promise.resolve({ id: 'other-search' }) });

    expect(res.status).toBe(404);
  });

  it('deve retornar Content-Type text/csv e Content-Disposition correto', async () => {
    const { getExport } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/search-uuid-1/export');
    const res = await getExport(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('dje-search-uuid-1.csv');
  });

  it('deve conter linha de header com colunas corretas no CSV', async () => {
    const { getExport } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/search-uuid-1/export');
    const res = await getExport(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    expect(res.status).toBe(200);
    const csvText = await res.text();
    const firstLine = csvText.split('\n')[0].trim();
    expect(firstLine).toBe(
      'numero_cnj,instancia,vara_camara,data_publicacao,caderno,texto_completo',
    );
  });

  it('deve remover tags HTML do texto_completo no CSV', async () => {
    const { getExport } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/search-uuid-1/export');
    const res = await getExport(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    const csvText = await res.text();
    expect(csvText).not.toContain('<mark>');
    expect(csvText).not.toContain('</mark>');
    // Mas o texto sem tag deve estar presente
    expect(csvText).toContain('execução fiscal');
  });

  it('deve tratar corretamente células com vírgulas e aspas (RFC 4180)', async () => {
    const { searchPublications } = await import('@/db/dje');
    vi.mocked(searchPublications).mockResolvedValue({
      results: [
        makeDjeSearchResult({
          court: 'Vara Cível, Central',
          snippet: 'Texto com "aspas" e vírgulas, múltiplas',
        }),
      ],
      total: 1,
    });

    const { getExport } = await getHandlers();
    const req = makeRequest('GET', 'http://localhost/api/dje/searches/search-uuid-1/export');
    const res = await getExport(req, { params: Promise.resolve({ id: 'search-uuid-1' }) });

    const csvText = await res.text();
    // Células com vírgulas devem estar entre aspas
    expect(csvText).toContain('"Vara Cível, Central"');
    // Aspas duplas internas devem ser escapadas como ""
    expect(csvText).toContain('"Texto com ""aspas"" e vírgulas, múltiplas"');
  });
});
