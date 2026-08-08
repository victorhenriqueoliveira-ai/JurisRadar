import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatPeriod,
  buildExportUrl,
  buildRerunUrl,
  fetchDjeSearchHistory,
  rerunDjeSearch,
  triggerCsvDownload,
} from '../utils';

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formata data YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatDate('2026-08-01')).toBe('01/08/2026');
  });

  it('formata data com dia e mês de um dígito corretamente', () => {
    expect(formatDate('2026-01-05')).toBe('05/01/2026');
  });

  it('formata 07/08/2026 corretamente', () => {
    expect(formatDate('2026-08-07')).toBe('07/08/2026');
  });
});

// ── formatDateTime ────────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('formata ISO datetime para DD/MM/YYYY HH:mm (UTC)', () => {
    expect(formatDateTime('2026-08-07T14:30:00.000Z')).toBe('07/08/2026 14:30');
  });

  it('preserva zeros à esquerda em hora e minuto', () => {
    expect(formatDateTime('2026-08-01T09:05:00.000Z')).toBe('01/08/2026 09:05');
  });

  it('formata meia-noite como 00:00', () => {
    expect(formatDateTime('2026-08-01T00:00:00.000Z')).toBe('01/08/2026 00:00');
  });
});

// ── formatPeriod ──────────────────────────────────────────────────────────────

describe('formatPeriod', () => {
  it('formata período como "DD/MM/YYYY a DD/MM/YYYY"', () => {
    expect(formatPeriod('2026-08-01', '2026-08-07')).toBe('01/08/2026 a 07/08/2026');
  });

  it('não retorna formato ISO 8601', () => {
    const result = formatPeriod('2026-08-01', '2026-08-07');
    expect(result).not.toContain('2026-08-01');
    expect(result).not.toContain('T');
  });
});

// ── buildExportUrl ────────────────────────────────────────────────────────────

describe('buildExportUrl', () => {
  it('constrói URL de exportação CSV correta', () => {
    expect(buildExportUrl('abc-123')).toBe('/api/dje/searches/abc-123/export');
  });
});

// ── buildRerunUrl ─────────────────────────────────────────────────────────────

describe('buildRerunUrl', () => {
  it('constrói URL de navegação pós-rerun', () => {
    expect(buildRerunUrl('novo-id-xyz')).toBe('/dje?searchId=novo-id-xyz');
  });
});

// ── fetchDjeSearchHistory ─────────────────────────────────────────────────────

describe('fetchDjeSearchHistory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retorna lista de buscas quando GET retorna 200', async () => {
    const mockData = {
      searches: [
        {
          id: 's1',
          term: 'rescisão',
          dateFrom: '2026-08-01',
          dateTo: '2026-08-07',
          totalResults: 42,
          executedAt: '2026-08-07T14:00:00.000Z',
          createdAt: '2026-08-07T14:00:00.000Z',
        },
      ],
      total: 1,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as unknown as Response);

    const result = await fetchDjeSearchHistory(1, 20);

    expect(fetch).toHaveBeenCalledWith('/api/dje/searches?page=1&limit=20');
    expect(result.searches).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.searches[0].term).toBe('rescisão');
  });

  it('lança erro quando GET retorna status não-ok', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as unknown as Response);

    await expect(fetchDjeSearchHistory(1, 20)).rejects.toThrow(
      'Erro ao carregar histórico de buscas',
    );
  });

  it('passa page e limit corretamente na query string', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ searches: [], total: 0 }),
    } as unknown as Response);

    await fetchDjeSearchHistory(3, 10);

    expect(fetch).toHaveBeenCalledWith('/api/dje/searches?page=3&limit=10');
  });
});

// ── rerunDjeSearch ────────────────────────────────────────────────────────────

describe('rerunDjeSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retorna novo searchId quando POST retorna 201', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ searchId: 'novo-id' }),
    } as unknown as Response);

    const result = await rerunDjeSearch('id-original');

    expect(fetch).toHaveBeenCalledWith('/api/dje/searches/id-original/rerun', {
      method: 'POST',
    });
    expect(result).toBe('novo-id');
  });

  it('lança erro quando POST retorna status não-ok', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown as Response);

    await expect(rerunDjeSearch('id-inexistente')).rejects.toThrow(
      'Erro ao reexecutar busca',
    );
  });
});

// ── triggerCsvDownload ────────────────────────────────────────────────────────

describe('triggerCsvDownload', () => {
  it('cria elemento <a> com href e download corretos e dispara click', () => {
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    const mockBody = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    };

    const mockDoc = {
      createElement: vi.fn().mockReturnValue(mockAnchor),
      body: mockBody,
    };

    triggerCsvDownload('busca-abc', mockDoc as unknown as Document);

    expect(mockDoc.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('/api/dje/searches/busca-abc/export');
    expect(mockAnchor.download).toBe('dje-busca-abc.csv');
    expect(mockBody.appendChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    expect(mockBody.removeChild).toHaveBeenCalledWith(mockAnchor);
  });

  it('usa o searchId correto na URL de exportação', () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    const mockDoc = {
      createElement: vi.fn().mockReturnValue(mockAnchor),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    };

    triggerCsvDownload('id-xyz', mockDoc as unknown as Document);

    expect(mockAnchor.href).toContain('/api/dje/searches/id-xyz/export');
    expect(mockAnchor.download).toBe('dje-id-xyz.csv');
  });
});
