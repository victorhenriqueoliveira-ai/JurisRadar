import { assertNumeroE164 } from './phone';
import {
  ZenviaError,
  type EnviarSMSInput,
  type EnviarWhatsAppInput,
  type ZenviaApiErrorResponse,
  type ZenviaApiMessageResponse,
  type ZenviaResult,
} from './types';

// ── Configuração ──────────────────────────────────────────────────────────────

const ZENVIA_BASE_URL = 'https://api.zenvia.com/v2';
const MAX_RETRIES = 3;
const BACKOFF_DELAYS_MS = [1000, 2000, 4000]; // backoff exponencial

/** Nome de exibição do remetente SMS na API Zenvia */
const SMS_FROM = 'JURISRADAR';

/** Template WhatsApp aprovado pela Meta para intimações críticas */
const WHATSAPP_TEMPLATE_NAME = 'intimacao_critica';

// ── Utilitários internos ──────────────────────────────────────────────────────

function getApiToken(): string {
  const token = process.env.ZENVIA_API_TOKEN;
  if (!token) {
    throw new Error(
      'Variável de ambiente ZENVIA_API_TOKEN não configurada. ' +
        'Defina-a no .env.local ou nas variáveis de ambiente do ambiente de execução.',
    );
  }
  return token;
}

function getWhatsAppNumber(): string {
  const number = process.env.ZENVIA_WHATSAPP_NUMBER;
  if (!number) {
    throw new Error(
      'Variável de ambiente ZENVIA_WHATSAPP_NUMBER não configurada. ' +
        'Defina-a no .env.local ou nas variáveis de ambiente do ambiente de execução.',
    );
  }
  return number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Token': getApiToken(),
  };
}

// ── Lógica de retry ───────────────────────────────────────────────────────────

/**
 * Executa um fetch com retry automático para erros 5xx.
 *
 * - Erros 5xx: retry com backoff exponencial (1s, 2s, 4s), máximo 3 tentativas.
 * - Erros 4xx: falha imediata, sem retry.
 * - Erros de rede: tratados como 5xx.
 *
 * @throws {ZenviaError} Após esgotar retries ou receber erro 4xx definitivo.
 */
async function fetchComRetry(
  url: string,
  options: RequestInit,
): Promise<ZenviaApiMessageResponse> {
  let lastError: ZenviaError | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let response: Response;

    try {
      response = await fetch(url, options);
    } catch (networkError) {
      // Erro de rede — trata como indisponibilidade temporária
      const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
      lastError = new ZenviaError(
        `Erro de rede ao chamar Zenvia: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
        'NETWORK_ERROR',
        0,
      );
      if (attempt < MAX_RETRIES - 1) {
        await sleep(delay);
      }
      continue;
    }

    if (response.ok) {
      const data = (await response.json()) as ZenviaApiMessageResponse;
      return data;
    }

    // 4xx — falha definitiva, sem retry
    if (response.status >= 400 && response.status < 500) {
      let errorCode = `HTTP_${response.status}`;
      let errorMessage = `Zenvia retornou ${response.status}`;

      try {
        const errorBody = (await response.json()) as ZenviaApiErrorResponse;
        if (errorBody.code) errorCode = errorBody.code;
        if (errorBody.message) errorMessage = errorBody.message;
      } catch {
        // Ignorar erro de parse do body
      }

      throw new ZenviaError(errorMessage, errorCode, response.status);
    }

    // 5xx — backoff exponencial
    if (response.status >= 500) {
      let errorCode = `HTTP_${response.status}`;
      let errorMessage = `Zenvia indisponível (${response.status})`;

      try {
        const errorBody = (await response.json()) as ZenviaApiErrorResponse;
        if (errorBody.code) errorCode = errorBody.code;
        if (errorBody.message) errorMessage = errorBody.message;
      } catch {
        // Ignorar erro de parse do body
      }

      lastError = new ZenviaError(errorMessage, errorCode, response.status);

      if (attempt < MAX_RETRIES - 1) {
        const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
        await sleep(delay);
      }
      continue;
    }
  }

  // Esgotou retries
  throw (
    lastError ??
    new ZenviaError(
      `Falha ao chamar Zenvia após ${MAX_RETRIES} tentativas`,
      'MAX_RETRIES_EXCEEDED',
      0,
    )
  );
}

// ── Implementação do cliente ──────────────────────────────────────────────────

/**
 * Envia SMS via API Zenvia.
 *
 * Valida o número no formato E.164 antes de qualquer chamada de rede.
 * Implementa retry com backoff exponencial para erros 5xx.
 *
 * @param input Parâmetros do SMS (destinatário, mensagem, correlationId opcional)
 * @returns `ZenviaResult` com messageId e status do envio
 * @throws {Error} Se o número estiver fora do formato E.164
 * @throws {ZenviaError} Se a API Zenvia retornar erro definitivo
 */
export async function enviarSMS(input: EnviarSMSInput): Promise<ZenviaResult> {
  assertNumeroE164(input.para);

  const payload = {
    from: SMS_FROM,
    to: input.para,
    contents: [
      {
        type: 'text',
        text: input.mensagem,
      },
    ],
    ...(input.correlationId ? { externalId: input.correlationId } : {}),
  };

  const data = await fetchComRetry(`${ZENVIA_BASE_URL}/sms/messages`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return {
    messageId: data.id,
    status: normalizeStatus(data.status),
  };
}

/**
 * Envia mensagem WhatsApp via template aprovado `intimacao_critica`.
 *
 * O template exige aprovação prévia da Meta via painel Zenvia.
 * Valida o número no formato E.164 antes de qualquer chamada de rede.
 *
 * Template: "[JurisRadar] Atenção: você tem uma intimação crítica no processo
 * {{processo_numero}} que requer sua ciência. Acesse: {{link}}"
 *
 * @param input Parâmetros do WhatsApp (destinatário, número do processo, link, correlationId opcional)
 * @returns `ZenviaResult` com messageId e status do envio
 * @throws {Error} Se o número estiver fora do formato E.164
 * @throws {ZenviaError} Se a API Zenvia retornar erro definitivo
 */
export async function enviarWhatsApp(input: EnviarWhatsAppInput): Promise<ZenviaResult> {
  assertNumeroE164(input.para);

  const payload = {
    from: getWhatsAppNumber(),
    to: input.para,
    contents: [
      {
        type: 'template',
        templateId: WHATSAPP_TEMPLATE_NAME,
        fields: {
          processo_numero: input.processoNumero,
          link: input.link,
        },
      },
    ],
    ...(input.correlationId ? { externalId: input.correlationId } : {}),
  };

  const data = await fetchComRetry(`${ZENVIA_BASE_URL}/whatsapp/messages`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return {
    messageId: data.id,
    status: normalizeStatus(data.status),
  };
}

// ── Utilitário de normalização ────────────────────────────────────────────────

function normalizeStatus(apiStatus: string | undefined): ZenviaResult['status'] {
  if (!apiStatus) return 'QUEUED';
  const upper = apiStatus.toUpperCase();
  if (upper === 'SENT') return 'SENT';
  if (upper === 'QUEUED' || upper === 'SCHEDULED') return 'QUEUED';
  if (upper === 'FAILED' || upper === 'ERROR') return 'FAILED';
  return 'QUEUED';
}

// ── Exportação da interface ───────────────────────────────────────────────────

/**
 * Instância padrão do ZenviaClient compatível com a interface `ZenviaClient`.
 * Pronto para injeção de dependência nos consumers (garantia-intimacao-escalador, notificacao-dispatcher).
 */
export const zenviaClient = {
  enviarSMS,
  enviarWhatsApp,
} satisfies import('./types').ZenviaClient;
