/**
 * Testes unitários do AsaasClient com mock do fetch global e do banco de dados.
 *
 * Padrão de teste: vi.mock estático de '@/db' no topo do arquivo (hoisted pelo Vite)
 * para evitar que o módulo tente conexão real com o Neon durante os testes.
 * O mock é configurado por teste via `mockResolvedValue` no objeto retornado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encrypt } from '../crypto';

// ── Mock estático do banco de dados ───────────────────────────────────────────
// DEVE ficar antes de qualquer import do módulo que usa @/db

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => mockDbSelect(),
    insert: () => mockDbInsert(),
  },
}));

// Imports do módulo a testar APÓS o vi.mock (ordem garantida pelo Vite)
import {
  criarSubConta,
  criarCobranca,
  criarAssinatura,
  cancelarCobranca,
  listarCobranças,
} from '../client';

// ── Constantes de teste ───────────────────────────────────────────────────────

const TEST_ENCRYPTION_KEY = 'a'.repeat(64); // 64 chars hex = 32 bytes
const TEST_MASTER_API_KEY = 'master-api-key-jurisradar';
const TEST_SUB_API_KEY = 'subconta-api-key-123456';

// ── Helpers de mock ───────────────────────────────────────────────────────────

function makeFetchResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  const responseHeaders = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: responseHeaders,
    json: async () => body,
  } as unknown as Response;
}

/** Configura o mock do db para retornar uma conta Asaas com a api_key criptografada */
function setupDbWithAccount(orgId: string) {
  const encryptedKey = encrypt(TEST_SUB_API_KEY);

  // select().from().where().limit() → [account]
  mockDbSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () =>
          Promise.resolve([
            {
              id: 'account-uuid',
              orgId,
              asaasAccountId: 'asaas-acc-id',
              apiKeyEncrypted: encryptedKey,
              status: 'active',
              onboardingUrl: null,
            },
          ]),
      }),
    }),
  });

  // insert().values() → undefined
  mockDbInsert.mockReturnValue({
    values: () => Promise.resolve(undefined),
  });
}

/** Configura o mock do db para não encontrar nenhuma conta (simula NOT_FOUND) */
function setupDbWithoutAccount() {
  mockDbSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  });
}

// ── Setup global ──────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.ASAAS_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  process.env.ASAAS_API_KEY = TEST_MASTER_API_KEY;
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test_mock';
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete process.env.ASAAS_ENCRYPTION_KEY;
  delete process.env.ASAAS_API_KEY;
  delete process.env.DATABASE_URL;
});

// ── Testes: criarSubConta ─────────────────────────────────────────────────────

describe('criarSubConta', () => {
  it('retorna { asaasAccountId, apiKey, status } em caso de sucesso', async () => {
    mockDbInsert.mockReturnValue({ values: () => Promise.resolve(undefined) });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        makeFetchResponse(200, {
          id: 'asaas-new-account-id',
          apiKey: 'new-sub-api-key',
          status: 'pending',
          onboardingUrl: 'https://sandbox.asaas.com/onboarding/abc',
        }),
      ),
    );

    const resultado = await criarSubConta({
      orgId: 'org-uuid-123',
      name: 'Escritório Teixeira',
      email: 'contato@teixeira.adv.br',
      cpfCnpj: '12.345.678/0001-90',
    });

    expect(resultado.asaasAccountId).toBe('asaas-new-account-id');
    expect(resultado.apiKey).toBe('new-sub-api-key');
    expect(resultado.status).toBe('pending');
    expect(resultado.onboardingUrl).toContain('onboarding');
  });

  it('persiste a api_key criptografada no banco (não texto plano)', async () => {
    let capturedValues: Record<string, unknown> = {};
    mockDbInsert.mockReturnValue({
      values: (vals: Record<string, unknown>) => {
        capturedValues = vals;
        return Promise.resolve(undefined);
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        makeFetchResponse(200, { id: 'acc-id', apiKey: 'raw-api-key-text', status: 'pending' }),
      ),
    );

    await criarSubConta({
      orgId: 'org-uuid',
      name: 'Escritório',
      email: 'email@test.com',
      cpfCnpj: '000.000.000-00',
    });

    expect(capturedValues.apiKeyEncrypted).toBeDefined();
    expect(capturedValues.apiKeyEncrypted).not.toBe('raw-api-key-text');
    // Formato AES-GCM: iv:authTag:ciphertext
    expect((capturedValues.apiKeyEncrypted as string).split(':')).toHaveLength(3);
  });

  it('usa o header access_token com a api key master do JurisRadar', async () => {
    mockDbInsert.mockReturnValue({ values: () => Promise.resolve(undefined) });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeFetchResponse(200, { id: 'acc', apiKey: 'k', status: 'pending' }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await criarSubConta({ orgId: 'org', name: 'Nome', email: 'e@e.com', cpfCnpj: '000' });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['access_token']).toBe(TEST_MASTER_API_KEY);
  });
});

// ── Testes: criarCobranca ─────────────────────────────────────────────────────

describe('criarCobranca', () => {
  it('retorna { asaasPaymentId, linkBoleto, qrCodePix } para tipo BOLETO_PIX', async () => {
    setupDbWithAccount('org-boleto-pix');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        makeFetchResponse(200, {
          id: 'pay-abc',
          status: 'PENDING',
          value: 1500,
          dueDate: '2026-10-15',
          bankSlipUrl: 'https://boleto.asaas.com/pay-abc',
          invoiceUrl: 'https://pix.asaas.com/pay-abc',
          pixCopiaECola: '00020126...',
        }),
      ),
    );

    const resultado = await criarCobranca({
      orgId: 'org-boleto-pix',
      honorarioId: 'hon-uuid',
      valor: 1500,
      vencimento: '2026-10-15',
      tipo: 'BOLETO_PIX',
      clienteEmail: 'cliente@email.com',
      clienteNome: 'João Silva',
      clienteCpfCnpj: '123.456.789-00',
      descricao: 'Honorários processo X',
    });

    expect(resultado.asaasPaymentId).toBe('pay-abc');
    expect(resultado.linkBoleto).toContain('boleto.asaas.com');
    expect(resultado.qrCodePix).toBe('00020126...');
    expect(resultado.status).toBe('PENDING');
  });

  it('lança erro com name AsaasError e code NOT_FOUND quando orgId não tem sub-conta', async () => {
    setupDbWithoutAccount();

    let thrownError: unknown;
    try {
      await criarCobranca({
        orgId: 'org-inexistente',
        honorarioId: 'hon-uuid',
        valor: 500,
        vencimento: '2026-10-15',
        tipo: 'PIX',
        clienteEmail: 'c@e.com',
        clienteNome: 'Maria',
        clienteCpfCnpj: '000.000.000-00',
        descricao: 'Honorários',
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect((thrownError as Error).name).toBe('AsaasError');
    expect((thrownError as { code: string }).code).toBe('NOT_FOUND');
  });

  it('usa externalReference = honorarioId no payload da cobrança', async () => {
    setupDbWithAccount('org-ref');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse(200, { id: 'pay-x', status: 'PENDING', value: 100 }));
    vi.stubGlobal('fetch', fetchMock);

    await criarCobranca({
      orgId: 'org-ref',
      honorarioId: 'hon-idempotente-uuid',
      valor: 100,
      vencimento: '2026-12-01',
      tipo: 'BOLETO',
      clienteEmail: 'c@e.com',
      clienteNome: 'C',
      clienteCpfCnpj: '000',
      descricao: 'desc',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.externalReference).toBe('hon-idempotente-uuid');
  });

  it('usa a api_key da sub-conta no header access_token (não a master)', async () => {
    setupDbWithAccount('org-key-check');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse(200, { id: 'pay-key', status: 'PENDING', value: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await criarCobranca({
      orgId: 'org-key-check',
      honorarioId: 'hon-x',
      valor: 200,
      vencimento: '2026-12-01',
      tipo: 'PIX',
      clienteEmail: 'c@e.com',
      clienteNome: 'C',
      clienteCpfCnpj: '000',
      descricao: 'desc',
    });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    // Não deve ser a chave master
    expect(headers['access_token']).not.toBe(TEST_MASTER_API_KEY);
    // Deve ser a chave descriptografada da sub-conta
    expect(headers['access_token']).toBe(TEST_SUB_API_KEY);
  });
});

// ── Testes: retry e AsaasError ────────────────────────────────────────────────

describe('retry e tratamento de erro', () => {
  it('executa retry até 3 vezes quando API retorna 429', async () => {
    setupDbWithAccount('org-429');
    // Stub setTimeout para não aguardar de verdade
    vi.stubGlobal('setTimeout', (fn: () => void) => { fn(); return 0; });

    const fetchMock = vi.fn().mockResolvedValue(
      makeFetchResponse(429, { errors: [{ code: 'RATE_LIMIT', description: 'Limite excedido' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    let thrownError: unknown;
    try {
      await criarCobranca({
        orgId: 'org-429',
        honorarioId: 'hon',
        valor: 100,
        vencimento: '2026-01-01',
        tipo: 'BOLETO',
        clienteEmail: 'c@e.com',
        clienteNome: 'C',
        clienteCpfCnpj: '000',
        descricao: 'desc',
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect((thrownError as Error).name).toBe('AsaasError');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('não faz retry quando API retorna 400 (erro de validação do cliente)', async () => {
    setupDbWithAccount('org-400');

    const fetchMock = vi.fn().mockResolvedValueOnce(
      makeFetchResponse(400, { errors: [{ code: 'INVALID_VALUE', description: 'Valor inválido' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    let thrownError: unknown;
    try {
      await criarCobranca({
        orgId: 'org-400',
        honorarioId: 'hon',
        valor: -1,
        vencimento: '2026-01-01',
        tipo: 'BOLETO',
        clienteEmail: 'c@e.com',
        clienteNome: 'C',
        clienteCpfCnpj: '000',
        descricao: 'desc',
      });
    } catch (err) {
      thrownError = err;
    }

    expect((thrownError as Error).name).toBe('AsaasError');
    // Apenas 1 tentativa — sem retry para 4xx
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('AsaasError preserva code e httpStatus originais da resposta Asaas', async () => {
    setupDbWithAccount('org-err');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        makeFetchResponse(400, {
          errors: [{ code: 'INVALID_CPF_CNPJ', description: 'CPF/CNPJ inválido' }],
        }),
      ),
    );

    let thrownError: unknown;
    try {
      await criarCobranca({
        orgId: 'org-err',
        honorarioId: 'hon',
        valor: 100,
        vencimento: '2026-01-01',
        tipo: 'BOLETO',
        clienteEmail: 'c@e.com',
        clienteNome: 'C',
        clienteCpfCnpj: 'invalido',
        descricao: 'desc',
      });
    } catch (err) {
      thrownError = err;
    }

    expect((thrownError as Error).name).toBe('AsaasError');
    expect((thrownError as { code: string }).code).toBe('INVALID_CPF_CNPJ');
    expect((thrownError as { httpStatus: number }).httpStatus).toBe(400);
    expect((thrownError as Error).message).toContain('CPF/CNPJ inválido');
  });

  it('sucede na segunda tentativa após um 503', async () => {
    setupDbWithAccount('org-retry-success');
    vi.stubGlobal('setTimeout', (fn: () => void) => { fn(); return 0; });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse(503, { errors: [{ code: 'UNAVAILABLE' }] }))
      .mockResolvedValueOnce(
        makeFetchResponse(200, { id: 'pay-retry', status: 'PENDING', value: 300 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await criarCobranca({
      orgId: 'org-retry-success',
      honorarioId: 'hon',
      valor: 300,
      vencimento: '2026-01-01',
      tipo: 'BOLETO',
      clienteEmail: 'c@e.com',
      clienteNome: 'C',
      clienteCpfCnpj: '000',
      descricao: 'desc',
    });

    expect(resultado.asaasPaymentId).toBe('pay-retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('lança AsaasError de rede após esgotar retries quando fetch rejeita com ECONNREFUSED', async () => {
    setupDbWithAccount('org-net');
    vi.stubGlobal('setTimeout', (fn: () => void) => { fn(); return 0; });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    let thrownError: unknown;
    try {
      await criarCobranca({
        orgId: 'org-net',
        honorarioId: 'hon',
        valor: 100,
        vencimento: '2026-01-01',
        tipo: 'BOLETO',
        clienteEmail: 'c@e.com',
        clienteNome: 'C',
        clienteCpfCnpj: '000',
        descricao: 'desc',
      });
    } catch (err) {
      thrownError = err;
    }

    expect((thrownError as Error).name).toBe('AsaasError');
    expect((thrownError as { code: string }).code).toBe('NETWORK_ERROR');
  });
});

// ── Testes: cancelarCobranca ──────────────────────────────────────────────────

describe('cancelarCobranca', () => {
  it('chama o endpoint correto com POST e resolve sem erro em sucesso', async () => {
    setupDbWithAccount('org-cancel');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse(200, { id: 'pay-cancel', status: 'CANCELLED' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(cancelarCobranca('pay-to-cancel', 'org-cancel')).resolves.toBeUndefined();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/payments/pay-to-cancel/cancel');
    expect((options as RequestInit).method).toBe('POST');
  });
});

// ── Testes: listarCobranças ───────────────────────────────────────────────────

describe('listarCobranças', () => {
  it('retorna array de cobranças mapeado corretamente da API Asaas', async () => {
    setupDbWithAccount('org-list');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        makeFetchResponse(200, {
          object: 'list',
          hasMore: false,
          totalCount: 2,
          limit: 10,
          offset: 0,
          data: [
            { id: 'pay-1', status: 'PENDING', value: 100, dueDate: '2026-10-01' },
            { id: 'pay-2', status: 'RECEIVED', value: 200, dueDate: '2026-10-15' },
          ],
        }),
      ),
    );

    const cobranças = await listarCobranças({ orgId: 'org-list' });

    expect(cobranças).toHaveLength(2);
    expect(cobranças[0].asaasPaymentId).toBe('pay-1');
    expect(cobranças[0].status).toBe('PENDING');
    expect(cobranças[1].asaasPaymentId).toBe('pay-2');
    expect(cobranças[1].status).toBe('RECEIVED');
  });

  it('passa status e datas como query params na URL', async () => {
    setupDbWithAccount('org-filtros');

    const fetchMock = vi.fn().mockResolvedValueOnce(
      makeFetchResponse(200, {
        object: 'list',
        hasMore: false,
        totalCount: 0,
        limit: 10,
        offset: 0,
        data: [],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await listarCobranças({
      orgId: 'org-filtros',
      status: 'OVERDUE',
      dataVencimentoInicio: '2026-09-01',
      dataVencimentoFim: '2026-09-30',
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('status=OVERDUE');
    expect(url).toContain('dueDateGe=2026-09-01');
    expect(url).toContain('dueDateLe=2026-09-30');
  });

  it('retorna array vazio quando não há cobranças', async () => {
    setupDbWithAccount('org-empty');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        makeFetchResponse(200, {
          object: 'list',
          hasMore: false,
          totalCount: 0,
          limit: 10,
          offset: 0,
          data: [],
        }),
      ),
    );

    const cobranças = await listarCobranças({ orgId: 'org-empty' });

    expect(cobranças).toHaveLength(0);
  });
});

// ── Testes: criarAssinatura ───────────────────────────────────────────────────

describe('criarAssinatura', () => {
  it('retorna { asaasSubscriptionId, status, valor, ciclo } em caso de sucesso', async () => {
    setupDbWithAccount('org-assinatura');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        makeFetchResponse(200, {
          id: 'sub-abc',
          status: 'ACTIVE',
          value: 500,
          cycle: 'MONTHLY',
          nextDueDate: '2026-10-01',
        }),
      ),
    );

    const resultado = await criarAssinatura({
      orgId: 'org-assinatura',
      honorarioId: 'hon-assinatura',
      valor: 500,
      ciclo: 'MONTHLY',
      dataInicio: '2026-10-01',
      clienteEmail: 'cliente@email.com',
      clienteNome: 'Maria Silva',
      clienteCpfCnpj: '987.654.321-00',
      descricao: 'Honorários mensais',
    });

    expect(resultado.asaasSubscriptionId).toBe('sub-abc');
    expect(resultado.status).toBe('ACTIVE');
    expect(resultado.valor).toBe(500);
    expect(resultado.ciclo).toBe('MONTHLY');
    expect(resultado.proximaCobranca).toBe('2026-10-01');
  });
});
