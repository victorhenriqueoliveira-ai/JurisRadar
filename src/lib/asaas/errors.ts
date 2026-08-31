/**
 * Erro tipado lançado pelo AsaasClient.
 *
 * Preserva o código de erro original da API Asaas para tratamento
 * granular por parte dos consumers (ex: NOT_FOUND vs VALIDATION).
 */
export class AsaasError extends Error {
  constructor(
    message: string,
    /** Código de erro da API Asaas (ex: "invalid_apiKey", "NOT_FOUND") */
    public readonly code: string,
    /** Status HTTP da resposta Asaas */
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'AsaasError';

    // Mantém o stack trace correto em V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AsaasError);
    }
  }
}
