/**
 * Cliente HTTP para a API Asaas — Hub Financeiro do JurisRadar.
 *
 * Encapsula toda comunicação com a API Asaas:
 * - Criação de sub-contas White Label por escritório
 * - Cobranças pontuais (boleto/Pix/BOLETO_PIX)
 * - Assinaturas recorrentes (parcelamento)
 * - Cancelamento e listagem de cobranças
 *
 * Padrões implementados:
 * - Retry com backoff exponencial (1s, 2s, 4s) para erros 429 e 5xx
 * - Lookup da api_key criptografada via org_id antes de cada chamada
 * - externalReference = cobrancas.id para idempotência em webhooks
 * - Erros tipados AsaasError com code e message originais da API
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { asaasAccounts } from '@/db/schema';
import { AsaasError } from './errors';
import { encrypt, decrypt } from './crypto';
import type {
  AsaasApiAssinaturaResponse,
  AsaasApiCobrancaResponse,
  AsaasApiErrorResponse,
  AsaasApiListResponse,
  AsaasApiSubContaResponse,
  AsaasAssinatura,
  AsaasClient,
  AsaasCobranca,
  AsaasSubConta,
  CriarAssinaturaInput,
  CriarCobrancaInput,
  CriarSubContaInput,
  ListarCobrancasInput,
} from './types';

// ── Configuração ──────────────────────────────────────────────────────────────

const ASAAS_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://www.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3';

const MAX_RETRIES = 3;
const BACKOFF_DELAYS_MS = [1000, 2000, 4000]; // backoff exponencial

// ── Utilitários internos ──────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    access_token: apiKey,
  };
}

/**
 * Extrai o primeiro erro da resposta Asaas.
 * Formato padrão: `{ "errors": [{ "code": "...", "description": "..." }] }`
 */
async function extractAsaasError(
  response: Response,
): Promise<{ code: string; message: string }> {
  let code = `HTTP_${response.status}`;
  let message = `Asaas retornou ${response.status}`;

  try {
    const body = (await response.json()) as AsaasApiErrorResponse;
    const firstError = body.errors?.[0];
    if (firstError?.code) code = firstError.code;
    if (firstError?.description) message = firstError.description;
  } catch {
    // Ignorar erro de parse
  }

  return { code, message };
}

/**
 * Executa um fetch com retry automático para erros 429 e 5xx.
 *
 * - 429 (rate limit): aguarda Retry-After ou delay padrão, depois retenta
 * - 5xx: backoff exponencial (1s, 2s, 4s), máximo 3 tentativas
 * - 4xx (exceto 429): falha imediata, sem retry
 * - Erros de rede: tratados como 5xx
 *
 * @throws {AsaasError} Após esgotar retries ou receber erro 4xx definitivo
 */
async function fetchComRetry<T>(url: string, options: RequestInit): Promise<T> {
  let lastError: AsaasError | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let response: Response;

    try {
      response = await fetch(url, options);
    } catch (networkError) {
      const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
      lastError = new AsaasError(
        `Erro de rede ao chamar Asaas: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
        'NETWORK_ERROR',
        0,
      );
      if (attempt < MAX_RETRIES - 1) {
        await sleep(delay);
      }
      continue;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    // 429 — rate limit: respeitar Retry-After
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
      const retryAfterMs = isNaN(retryAfterSec) ? 60000 : retryAfterSec * 1000;
      const { code, message } = await extractAsaasError(response);
      lastError = new AsaasError(message, code, response.status);
      await sleep(retryAfterMs);
      continue;
    }

    // 4xx (exceto 429) — falha definitiva, sem retry
    if (response.status >= 400 && response.status < 500) {
      const { code, message } = await extractAsaasError(response);
      throw new AsaasError(message, code, response.status);
    }

    // 5xx — backoff exponencial
    if (response.status >= 500) {
      const { code, message } = await extractAsaasError(response);
      lastError = new AsaasError(message, code, response.status);
      if (attempt < MAX_RETRIES - 1) {
        const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
        await sleep(delay);
      }
      continue;
    }
  }

  throw (
    lastError ??
    new AsaasError(
      `Falha ao chamar Asaas após ${MAX_RETRIES} tentativas`,
      'MAX_RETRIES_EXCEEDED',
      0,
    )
  );
}

// ── Lookup de API key ─────────────────────────────────────────────────────────

/**
 * Busca e descriptografa a api_key da sub-conta Asaas de um escritório.
 *
 * @throws {AsaasError} Com code "NOT_FOUND" se o escritório não tiver sub-conta
 */
async function resolverApiKey(orgId: string): Promise<string> {
  const [account] = await db
    .select()
    .from(asaasAccounts)
    .where(eq(asaasAccounts.orgId, orgId))
    .limit(1);

  if (!account) {
    throw new AsaasError(
      `Nenhuma sub-conta Asaas encontrada para org_id: ${orgId}`,
      'NOT_FOUND',
      404,
    );
  }

  return decrypt(account.apiKeyEncrypted);
}

// ── Implementação dos métodos ─────────────────────────────────────────────────

/**
 * Cria uma sub-conta Asaas (White Label) para um escritório.
 * Persiste o registro em `asaas_accounts` com a api_key criptografada.
 */
async function criarSubConta(dados: CriarSubContaInput): Promise<AsaasSubConta> {
  // Sub-conta usa a API key master da plataforma JurisRadar
  const masterApiKey = process.env.ASAAS_API_KEY;
  if (!masterApiKey) {
    throw new Error(
      'Variável de ambiente ASAAS_API_KEY não configurada. ' +
        'Defina a API key master do JurisRadar.',
    );
  }

  const payload = {
    name: dados.name,
    email: dados.email,
    cpfCnpj: dados.cpfCnpj,
    ...(dados.companyType ? { companyType: dados.companyType } : {}),
    ...(dados.phone ? { phone: dados.phone } : {}),
    ...(dados.mobilePhone ? { mobilePhone: dados.mobilePhone } : {}),
    ...(dados.site ? { site: dados.site } : {}),
    ...(dados.address ? { address: dados.address } : {}),
    ...(dados.addressNumber ? { addressNumber: dados.addressNumber } : {}),
    ...(dados.complement ? { complement: dados.complement } : {}),
    ...(dados.province ? { province: dados.province } : {}),
    ...(dados.postalCode ? { postalCode: dados.postalCode } : {}),
    ...(dados.incomeValue ? { incomeValue: dados.incomeValue } : {}),
  };

  const apiResponse = await fetchComRetry<AsaasApiSubContaResponse>(
    `${ASAAS_BASE_URL}/accounts`,
    {
      method: 'POST',
      headers: buildHeaders(masterApiKey),
      body: JSON.stringify(payload),
    },
  );

  const apiKey = apiResponse.apiKey ?? '';
  const apiKeyEncrypted = encrypt(apiKey);
  const status = (apiResponse.status as 'pending' | 'active' | 'suspended') ?? 'pending';

  // Persiste no banco com api_key criptografada
  await db.insert(asaasAccounts).values({
    orgId: dados.orgId,
    asaasAccountId: apiResponse.id,
    apiKeyEncrypted,
    status,
    onboardingUrl: apiResponse.onboardingUrl ?? null,
  });

  return {
    asaasAccountId: apiResponse.id,
    apiKey, // Retorna sem criptografia apenas neste momento inicial
    onboardingUrl: apiResponse.onboardingUrl,
    status,
  };
}

/**
 * Cria uma cobrança pontual (boleto, Pix ou ambos) via Asaas.
 *
 * Usa `externalReference = cobrancas.id` para idempotência em webhooks.
 * O `cobrancas.id` deve ser gerado pelo consumer antes de chamar este método.
 */
async function criarCobranca(input: CriarCobrancaInput): Promise<AsaasCobranca> {
  const apiKey = await resolverApiKey(input.orgId);

  const payload = {
    customer: input.clienteEmail, // Asaas aceita email como identificador
    billingType: input.tipo,
    value: input.valor,
    dueDate: input.vencimento,
    description: input.descricao,
    externalReference: input.honorarioId, // Idempotência via honorarioId
    postalService: false,
  };

  const apiResponse = await fetchComRetry<AsaasApiCobrancaResponse>(
    `${ASAAS_BASE_URL}/payments`,
    {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify(payload),
    },
  );

  return mapCobranca(apiResponse);
}

/**
 * Cria uma assinatura recorrente (parcelamento) via Asaas.
 */
async function criarAssinatura(input: CriarAssinaturaInput): Promise<AsaasAssinatura> {
  const apiKey = await resolverApiKey(input.orgId);

  const payload = {
    customer: input.clienteEmail,
    billingType: 'BOLETO',
    value: input.valor,
    nextDueDate: input.dataInicio,
    cycle: input.ciclo,
    description: input.descricao,
    externalReference: input.honorarioId,
    ...(input.totalParcelas ? { maxPayments: input.totalParcelas } : {}),
  };

  const apiResponse = await fetchComRetry<AsaasApiAssinaturaResponse>(
    `${ASAAS_BASE_URL}/subscriptions`,
    {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify(payload),
    },
  );

  return {
    asaasSubscriptionId: apiResponse.id,
    status: apiResponse.status,
    valor: apiResponse.value,
    ciclo: apiResponse.cycle,
    proximaCobranca: apiResponse.nextDueDate,
  };
}

/**
 * Cancela uma cobrança existente no Asaas.
 */
async function cancelarCobranca(asaasPaymentId: string, orgId: string): Promise<void> {
  const apiKey = await resolverApiKey(orgId);

  await fetchComRetry<Record<string, unknown>>(
    `${ASAAS_BASE_URL}/payments/${asaasPaymentId}/cancel`,
    {
      method: 'POST',
      headers: buildHeaders(apiKey),
    },
  );
}

/**
 * Lista cobranças com filtros opcionais de status e período de vencimento.
 */
async function listarCobranças(filtros: ListarCobrancasInput): Promise<AsaasCobranca[]> {
  const apiKey = await resolverApiKey(filtros.orgId);

  const params = new URLSearchParams();
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.dataVencimentoInicio) params.set('dueDateGe', filtros.dataVencimentoInicio);
  if (filtros.dataVencimentoFim) params.set('dueDateLe', filtros.dataVencimentoFim);
  if (filtros.offset !== undefined) params.set('offset', String(filtros.offset));
  if (filtros.limit !== undefined) params.set('limit', String(filtros.limit));

  const url = `${ASAAS_BASE_URL}/payments?${params.toString()}`;
  const apiResponse = await fetchComRetry<AsaasApiListResponse<AsaasApiCobrancaResponse>>(url, {
    method: 'GET',
    headers: buildHeaders(apiKey),
  });

  return (apiResponse.data ?? []).map(mapCobranca);
}

// ── Mapeamento de resposta ────────────────────────────────────────────────────

function mapCobranca(raw: AsaasApiCobrancaResponse): AsaasCobranca {
  return {
    asaasPaymentId: raw.id,
    status: normalizeStatus(raw.status),
    valor: raw.value,
    vencimento: raw.dueDate,
    linkBoleto: raw.bankSlipUrl ?? raw.invoiceUrl,
    linkPix: raw.invoiceUrl,
    qrCodePix: raw.pixCopiaECola,
  };
}

function normalizeStatus(
  status: string,
): AsaasCobranca['status'] {
  const map: Record<string, AsaasCobranca['status']> = {
    PENDING: 'PENDING',
    RECEIVED: 'RECEIVED',
    CONFIRMED: 'CONFIRMED',
    OVERDUE: 'OVERDUE',
    REFUNDED: 'REFUNDED',
    CANCELLED: 'CANCELLED',
    REFUND_REQUESTED: 'REFUNDED',
  };
  return map[status.toUpperCase()] ?? 'PENDING';
}

// ── Exportação ────────────────────────────────────────────────────────────────

/**
 * Instância padrão do AsaasClient compatível com a interface `AsaasClient`.
 * Pronto para injeção de dependência nos consumers (rotas API Asaas, cron, etc.).
 */
export const asaasClient = {
  criarSubConta,
  criarCobranca,
  criarAssinatura,
  cancelarCobranca,
  listarCobranças,
} satisfies AsaasClient;

// Exportações nomeadas para facilitar mocking em testes
export { criarSubConta, criarCobranca, criarAssinatura, cancelarCobranca, listarCobranças };
export { resolverApiKey };
