import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZenviaError } from '../types';

// ── Setup do ambiente ─────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.ZENVIA_API_TOKEN = 'test-token-zenvia';
  process.env.ZENVIA_WHATSAPP_NUMBER = '+5511900000000';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ZENVIA_API_TOKEN;
  delete process.env.ZENVIA_WHATSAPP_NUMBER;
});

// ── Helpers de mock ───────────────────────────────────────────────────────────

function makeFetchResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function makeSuccessResponse(messageId = 'msg-abc123') {
  return makeFetchResponse(200, { id: messageId, status: 'SENT' });
}

// ── Testes: enviarSMS ─────────────────────────────────────────────────────────

describe('enviarSMS', () => {
  it('retorna { messageId, status: SENT } para número válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeSuccessResponse('sms-001')));

    const { enviarSMS } = await import('../client');
    const resultado = await enviarSMS({ para: '+5511999999999', mensagem: 'Teste intimação' });

    expect(resultado).toEqual({ messageId: 'sms-001', status: 'SENT' });
  });

  it('usa o header X-API-Token correto', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { enviarSMS } = await import('../client');
    await enviarSMS({ para: '+5511999999999', mensagem: 'Teste' });

    const chamadaArgs = fetchMock.mock.calls[0];
    const headers = chamadaArgs[1].headers as Record<string, string>;
    expect(headers['X-API-Token']).toBe('test-token-zenvia');
  });

  it('chama o endpoint correto de SMS', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { enviarSMS } = await import('../client');
    await enviarSMS({ para: '+5511999999999', mensagem: 'Teste' });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('https://api.zenvia.com/v2/sms/messages');
  });

  it('lança erro de validação para número sem DDI (sem chamar a API)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { enviarSMS } = await import('../client');

    await expect(
      enviarSMS({ para: '11999999999', mensagem: 'Teste' }),
    ).rejects.toThrow('Número de telefone inválido');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('inclui correlationId como externalId no payload quando fornecido', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { enviarSMS } = await import('../client');
    await enviarSMS({
      para: '+5511999999999',
      mensagem: 'Teste com correlation',
      correlationId: 'corr-xyz',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.externalId).toBe('corr-xyz');
  });

  it('não inclui externalId no payload quando correlationId não é fornecido', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { enviarSMS } = await import('../client');
    await enviarSMS({ para: '+5511999999999', mensagem: 'Teste sem correlation' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.externalId).toBeUndefined();
  });
});

// ── Testes: enviarWhatsApp ────────────────────────────────────────────────────

describe('enviarWhatsApp', () => {
  it('usa o template intimacao_critica com variáveis corretas no payload', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeSuccessResponse('wp-001'));
    vi.stubGlobal('fetch', fetchMock);

    const { enviarWhatsApp } = await import('../client');
    await enviarWhatsApp({
      para: '+5511999999999',
      processoNumero: '1234567-89.2025.8.26.0100',
      link: 'https://app.jurisradar.com.br/confirmar/abc123',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const content = body.contents[0];
    expect(content.templateId).toBe('intimacao_critica');
    expect(content.fields.processo_numero).toBe('1234567-89.2025.8.26.0100');
    expect(content.fields.link).toBe('https://app.jurisradar.com.br/confirmar/abc123');
  });

  it('chama o endpoint correto de WhatsApp', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { enviarWhatsApp } = await import('../client');
    await enviarWhatsApp({
      para: '+5511999999999',
      processoNumero: '1234567',
      link: 'https://link.com',
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('https://api.zenvia.com/v2/whatsapp/messages');
  });

  it('lança erro de validação para número inválido antes de chamar a API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { enviarWhatsApp } = await import('../client');

    await expect(
      enviarWhatsApp({
        para: 'numero-invalido',
        processoNumero: '1234',
        link: 'https://link.com',
      }),
    ).rejects.toThrow('Número de telefone inválido');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna { messageId, status: SENT } em caso de sucesso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeSuccessResponse('wp-abc')));

    const { enviarWhatsApp } = await import('../client');
    const resultado = await enviarWhatsApp({
      para: '+5511999999999',
      processoNumero: '1234',
      link: 'https://link.com',
    });

    expect(resultado).toEqual({ messageId: 'wp-abc', status: 'SENT' });
  });
});

// ── Testes: retry e ZenviaError ───────────────────────────────────────────────

describe('retry e tratamento de erro', () => {
  it('executa retry 3 vezes quando API retorna 503 e lança ZenviaError', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeFetchResponse(503, { code: 'SERVICE_UNAVAILABLE', message: 'Indisponível' }));
    vi.stubGlobal('fetch', fetchMock);
    // Substituir setTimeout para retornar imediatamente (evita delays de backoff nos testes)
    vi.stubGlobal('setTimeout', (fn: () => void) => { fn(); return 0; });

    const { enviarSMS } = await import('../client');

    await expect(
      enviarSMS({ para: '+5511999999999', mensagem: 'Teste retry' }),
    ).rejects.toThrow(ZenviaError);

    expect(fetchMock).toHaveBeenCalledTimes(3);

    vi.unstubAllGlobals();
  });

  it('ZenviaError contém o code original da resposta Zenvia após 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeFetchResponse(503, { code: 'GATEWAY_TIMEOUT', message: 'timeout' })));
    vi.stubGlobal('setTimeout', (fn: () => void) => { fn(); return 0; });

    const { enviarSMS } = await import('../client');

    try {
      await enviarSMS({ para: '+5511999999999', mensagem: 'Teste code' });
      throw new Error('Deveria ter lançado ZenviaError');
    } catch (err) {
      expect(err).toBeInstanceOf(ZenviaError);
      expect((err as ZenviaError).code).toBe('GATEWAY_TIMEOUT');
      expect((err as ZenviaError).httpStatus).toBe(503);
    }

    vi.unstubAllGlobals();
  });

  it('não faz retry quando API retorna 400', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse(400, { code: 'INVALID_PARAMETER', message: 'Parâmetro inválido' }));
    vi.stubGlobal('fetch', fetchMock);

    const { enviarSMS } = await import('../client');

    await expect(
      enviarSMS({ para: '+5511999999999', mensagem: 'Teste 400' }),
    ).rejects.toThrow(ZenviaError);

    // Apenas 1 tentativa — sem retry para 4xx
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ZenviaError contém o code original da resposta 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(makeFetchResponse(400, { code: 'INVALID_PARAMETER' })),
    );

    const { enviarSMS } = await import('../client');

    try {
      await enviarSMS({ para: '+5511999999999', mensagem: 'Teste' });
      throw new Error('Deveria ter lançado ZenviaError');
    } catch (err) {
      expect(err).toBeInstanceOf(ZenviaError);
      expect((err as ZenviaError).code).toBe('INVALID_PARAMETER');
      expect((err as ZenviaError).httpStatus).toBe(400);
    }
  });

  it('sucede na segunda tentativa após um 503', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse(503, { code: 'TEMP_ERROR' }))
      .mockResolvedValueOnce(makeSuccessResponse('retry-success'));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('setTimeout', (fn: () => void) => { fn(); return 0; });

    const { enviarSMS } = await import('../client');
    const resultado = await enviarSMS({ para: '+5511999999999', mensagem: 'Retry success' });

    expect(resultado.messageId).toBe('retry-success');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it('lança ZenviaError de rede após esgotar retries quando fetch rejeita', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('setTimeout', (fn: () => void) => { fn(); return 0; });

    const { enviarSMS } = await import('../client');

    try {
      await enviarSMS({ para: '+5511999999999', mensagem: 'Teste rede' });
      throw new Error('Deveria ter lançado ZenviaError');
    } catch (err) {
      expect(err).toBeInstanceOf(ZenviaError);
      expect((err as ZenviaError).code).toBe('NETWORK_ERROR');
    }

    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
  });

  it('normaliza status QUEUED da API corretamente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeFetchResponse(200, { id: 'q-1', status: 'QUEUED' })));

    const { enviarSMS } = await import('../client');
    const resultado = await enviarSMS({ para: '+5511999999999', mensagem: 'Teste queued' });

    expect(resultado.status).toBe('QUEUED');
  });

  it('normaliza status FAILED da API corretamente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeFetchResponse(200, { id: 'f-1', status: 'FAILED' })));

    const { enviarSMS } = await import('../client');
    const resultado = await enviarSMS({ para: '+5511999999999', mensagem: 'Teste failed' });

    expect(resultado.status).toBe('FAILED');
  });

  it('normaliza status desconhecido como QUEUED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeFetchResponse(200, { id: 'u-1', status: 'UNKNOWN_STATUS' })));

    const { enviarSMS } = await import('../client');
    const resultado = await enviarSMS({ para: '+5511999999999', mensagem: 'Teste unknown' });

    expect(resultado.status).toBe('QUEUED');
  });
});
