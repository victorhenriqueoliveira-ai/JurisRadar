// Interfaces de domínio para integração com a API DataJud do CNJ

// ── Erros tipados ─────────────────────────────────────────────────────────────

/** Erro lançado quando o DataJud retorna 429 Too Many Requests */
export class DataJudRateLimitError extends Error {
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`DataJud rate limit atingido — aguardar ${retryAfter}s`);
    this.name = 'DataJudRateLimitError';
    this.retryAfter = retryAfter;
  }
}

/** Erro lançado quando o DataJud retorna 5xx ou está indisponível após retries */
export class DataJudUnavailableError extends Error {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'DataJudUnavailableError';
    this.statusCode = statusCode;
  }
}

// ── Filtros de busca ──────────────────────────────────────────────────────────

/** Filtros aceitos pela busca federada ao DataJud */
export interface SearchFilters {
  assunto?: string[];                              // texto livre ou código do assunto
  classe?: string[];                              // código da classe processual CNJ
  grau?: ('G1' | 'G2' | 'JE' | 'SUP')[];
  dataDistribuicaoInicio?: string;                // ISO 8601: "2025-01-01"
  dataDistribuicaoFim?: string;
  buscaLivre?: string;
  numeroProcesso?: string;                        // número CNJ ex: "0001234-56.2023.8.26.0001"
  comarca?: string;                               // cidade/comarca ex: "Campinas"
}

// ── Resultado de processo ─────────────────────────────────────────────────────

export interface Movimentacao {
  data: string;
  descricao: string;
}

/** Resultado normalizado de um processo judicial retornado pelo DataJud */
export interface ProcessoResult {
  numero: string;                                // formato CNJ — obrigatório
  tribunal: string;                              // sigla: "TJSP", "TRF3", etc.
  grau: string;
  classe?: string;
  assunto?: string;
  assuntos?: string[];                           // todos os assuntos
  dataDistribuicao?: string;
  orgaoJulgador?: string;
  partes?: { polo: 'ativo' | 'passivo'; nome: string }[];
  ultimaMovimentacao?: Movimentacao;
  movimentos?: Movimentacao[];                   // histórico completo
}
