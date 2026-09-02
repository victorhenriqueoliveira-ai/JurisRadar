import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataJudRateLimitError, DataJudUnavailableError } from '../types';

// ── Setup do ambiente ─────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.DATAJUD_API_KEY = 'test-api-key';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.DATAJUD_API_KEY;
});

// ── Helpers de mock ───────────────────────────────────────────────────────────

function makeFetchResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    json: async () => body,
  } as unknown as Response;
}

/**
 * Monta resposta DataJud v2 usando a estrutura real da API (campos na raiz do _source,
 * sem dadosBasicos). Atualizado após fix(datajud): corrigir campos da API DataJud v2.
 */
function makeDataJudResponse(numeros: string[]) {
  return {
    hits: {
      total: { value: numeros.length },
      hits: numeros.map((numero) => ({
        _source: {
          numeroProcesso: numero,
          tribunal: 'TJSP',
          grau: 'G1',
          classe: { nome: 'Ação Civil' },
          assuntos: [{ nome: 'Pensão Alimentícia' }],
          dataAjuizamento: '2025-01-15',
          orgaoJulgador: { nome: '1ª Vara de Família' },
          partes: [
            { polo: 'ativo', nome: 'João Silva' },
            { polo: 'passivo', nome: 'Maria Santos' },
          ],
          movimentos: [
            {
              dataHora: '2025-06-01T10:00:00Z',
              nome: 'Sentença publicada',
            },
          ],
        },
      })),
    },
  };
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('queryTribunal', () => {
  it('retorna ProcessoResult com numero preenchido em resposta bem-sucedida', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeFetchResponse(200, makeDataJudResponse(['0001234-56.2025.8.26.0001'])),
    );

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjsp', { grau: ['G1'] });

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].numero).toBe('0001234-56.2025.8.26.0001');
    expect(result.total).toBe(1);
  });

  it('descarta CPF e documentos das partes (LGPD)', async () => {
    const responseComCpf = {
      hits: {
        total: { value: 1 },
        hits: [{
          _source: {
            numeroProcesso: '0001234-56.2025.8.26.0001',
            tribunal: 'TJSP',
            grau: 'G1',
            partes: [
              { polo: 'ativo', nome: 'João Silva', cpf: '123.456.789-00' } as unknown,
              { polo: 'passivo', nome: 'Maria Santos', documento: '987654321' } as unknown,
            ],
            movimentos: [],
          },
        }],
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValue(makeFetchResponse(200, responseComCpf));

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjsp', { grau: ['G1'] });

    const partes = result.hits[0].partes ?? [];
    expect(partes).toHaveLength(2);
    for (const parte of partes) {
      expect(parte).not.toHaveProperty('cpf');
      expect(parte).not.toHaveProperty('documento');
      expect(parte).not.toHaveProperty('cnpj');
      expect(parte).toHaveProperty('polo');
      expect(parte).toHaveProperty('nome');
    }
  });

  it('retorna ProcessoResult com numero mesmo quando campos opcionais estão ausentes', async () => {
    const minimalResponse = {
      hits: {
        total: { value: 1 },
        hits: [
          {
            _source: {
              numeroProcesso: '0009999-11.2025.8.26.0002',
              tribunal: 'TJSP',
              grau: 'G1',
            },
          },
        ],
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeFetchResponse(200, minimalResponse),
    );

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjsp', {});

    expect(result.hits[0].numero).toBe('0009999-11.2025.8.26.0002');
    expect(result.hits[0].classe).toBeUndefined();
    expect(result.hits[0].assunto).toBeUndefined();
  });

  it('com resposta 429 e Retry-After aguarda antes de retentar', async () => {
    const setTimeoutSpy = vi
      .spyOn(global, 'setTimeout')
      .mockImplementation((fn: TimerHandler) => {
        if (typeof fn === 'function') fn();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        makeFetchResponse(429, {}, { 'Retry-After': '2' }),
      )
      .mockResolvedValueOnce(
        makeFetchResponse(200, makeDataJudResponse(['0001111-22.2025.8.26.0001'])),
      );

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjsp', { grau: ['G1'] });

    expect(result.hits[0].numero).toBe('0001111-22.2025.8.26.0001');
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it('com resposta 503 retenta 3x com backoff e lança DataJudUnavailableError', async () => {
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(makeFetchResponse(503, {}));

    const { queryTribunal } = await import('../client');

    await expect(
      queryTribunal('api_publica_tjsp', { grau: ['G1'] }),
    ).rejects.toThrow(DataJudUnavailableError);

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('com resposta 400 não retenta e relança o erro imediatamente', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(makeFetchResponse(400, {}));

    const { queryTribunal } = await import('../client');
    await expect(
      queryTribunal('api_publica_tjsp', { grau: ['G1'] }),
    ).rejects.toThrow(/sem retry/);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('lança DataJudRateLimitError após múltiplos 429 e esgotamento de retries', async () => {
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeFetchResponse(429, {}, { 'Retry-After': '1' }),
    );

    const { queryTribunal } = await import('../client');

    await expect(
      queryTribunal('api_publica_tjsp', { grau: ['G1'] }),
    ).rejects.toThrow(DataJudRateLimitError);
  });

  it('retorna hits e total corretamente para múltiplos resultados', async () => {
    const numeros = [
      '0001111-11.2025.8.26.0001',
      '0002222-22.2025.8.26.0002',
      '0003333-33.2025.8.26.0003',
    ];

    vi.spyOn(global, 'fetch').mockResolvedValue(
      makeFetchResponse(200, makeDataJudResponse(numeros)),
    );

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjsp', { grau: ['G1'] }, 0, 5);

    expect(result.hits).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.hits.map((h) => h.numero)).toEqual(numeros);
  });

  it('trata total numérico simples (não object) na resposta DataJud', async () => {
    const response = {
      hits: {
        total: 5,
        hits: [
          {
            _source: {
              numeroProcesso: '0007777-77.2025.8.26.0001',
              tribunal: 'TJMG',
              grau: 'G2',
            },
          },
        ],
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValue(makeFetchResponse(200, response));

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjmg', {});

    expect(result.total).toBe(5);
    expect(result.hits[0].numero).toBe('0007777-77.2025.8.26.0001');
  });

  it('lança erro quando DATAJUD_API_KEY não está configurada', async () => {
    delete process.env.DATAJUD_API_KEY;

    const { queryTribunal } = await import('../client');
    await expect(queryTribunal('api_publica_tjsp', {})).rejects.toThrow(
      /DATAJUD_API_KEY/,
    );
  });

  it('retenta em erro de rede (fetch rejeita) com backoff e lança DataJudUnavailableError', async () => {
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('Network error'));

    const { queryTribunal } = await import('../client');

    await expect(
      queryTribunal('api_publica_tjsp', { grau: ['G1'] }),
    ).rejects.toThrow(DataJudUnavailableError);

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('mapeia polo passivo corretamente', async () => {
    const response = {
      hits: {
        total: { value: 1 },
        hits: [
          {
            _source: {
              numeroProcesso: '0005555-55.2025.8.26.0001',
              tribunal: 'TJSP',
              grau: 'G1',
              partes: [
                { polo: 'passivo', nome: 'Empresa XYZ Ltda' },
              ],
            },
          },
        ],
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValue(makeFetchResponse(200, response));

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjsp', {});

    expect(result.hits[0].partes?.[0].polo).toBe('passivo');
    expect(result.hits[0].partes?.[0]).not.toHaveProperty('cnpj');
  });

  it('retorna hits vazio quando DataJud retorna hits sem numeroProcesso', async () => {
    const response = {
      hits: {
        total: { value: 1 },
        hits: [{ _source: { tribunal: 'TJSP', grau: 'G1' } }],
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValue(makeFetchResponse(200, response));

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjsp', {});

    expect(result.hits).toHaveLength(0);
  });

  it('ultima movimentação usa complementosTabelados quando nome não existe', async () => {
    const response = {
      hits: {
        total: { value: 1 },
        hits: [
          {
            _source: {
              numeroProcesso: '0006666-66.2025.8.26.0001',
              tribunal: 'TJSP',
              grau: 'G1',
              movimentos: [
                {
                  dataHora: '2025-07-01T08:00:00Z',
                  complementosTabelados: [{ descricao: 'Juntada de petição' }],
                },
              ],
            },
          },
        ],
      },
    };

    vi.spyOn(global, 'fetch').mockResolvedValue(makeFetchResponse(200, response));

    const { queryTribunal } = await import('../client');
    const result = await queryTribunal('api_publica_tjsp', {});

    expect(result.hits[0].ultimaMovimentacao?.descricao).toBe('Juntada de petição');
  });
});
