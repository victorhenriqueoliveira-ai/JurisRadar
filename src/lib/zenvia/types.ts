// ── Tipos públicos do ZenviaClient ────────────────────────────────────────────

export interface EnviarSMSInput {
  /** Número do destinatário com DDI — obrigatoriamente formato E.164 (+55...) */
  para: string;
  /** Corpo do SMS — máximo 160 caracteres */
  mensagem: string;
  /** ID de correlação opcional para rastreamento externo */
  correlationId?: string;
}

export interface EnviarWhatsAppInput {
  /** Número do destinatário com DDI — obrigatoriamente formato E.164 (+55...) */
  para: string;
  /** Número do processo judicial para preencher o template */
  processoNumero: string;
  /** URL de confirmação de ciência para preencher o template */
  link: string;
  /** ID de correlação opcional para rastreamento externo */
  correlationId?: string;
}

export interface ZenviaResult {
  /** ID da mensagem retornado pela API Zenvia */
  messageId: string;
  /** Status reportado pela API Zenvia no momento do envio */
  status: 'SENT' | 'QUEUED' | 'FAILED';
}

// ── Interface pública do cliente ──────────────────────────────────────────────

export interface ZenviaClient {
  enviarSMS(input: EnviarSMSInput): Promise<ZenviaResult>
  enviarWhatsApp(input: EnviarWhatsAppInput): Promise<ZenviaResult>
}

// ── Erro tipado ───────────────────────────────────────────────────────────────

/**
 * Lançado quando a API Zenvia retorna um erro definitivo (não-recuperável)
 * ou quando todas as tentativas de retry se esgotam.
 */
export class ZenviaError extends Error {
  /** Código de erro original retornado pela API Zenvia */
  readonly code: string;
  /** Status HTTP da resposta */
  readonly httpStatus: number;

  constructor(message: string, code: string, httpStatus: number) {
    super(message);
    this.name = 'ZenviaError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ── Tipos internos de resposta da API Zenvia ──────────────────────────────────

export interface ZenviaApiMessageResponse {
  id: string;
  status?: string;
  [key: string]: unknown;
}

export interface ZenviaApiErrorResponse {
  code?: string;
  message?: string;
  [key: string]: unknown;
}
