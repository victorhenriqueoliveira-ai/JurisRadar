/**
 * Interfaces TypeScript centrais para a feature de monitoramento DJE/TJSP.
 * Cadernos 2 (instância 2) e 3 (instância 1) do Diário da Justiça Eletrônico.
 */

/** Publicação individual extraída do DJE */
export interface DjePublication {
  /** Número do processo no formato CNJ: 0000000-00.0000.0.00.0000 */
  processNumber: string;
  /** Instância derivada do caderno: caderno 3 → '1', caderno 2 → '2' */
  instance: '1' | '2';
  court: string | null;
  /** Data de publicação no formato ISO 8601: "YYYY-MM-DD" */
  publicationDate: string;
  caderno: 2 | 3;
  content: string;
}

/** Status de processamento de uma edição do DJE */
export interface DjeEditionStatus {
  /** Data da edição no formato ISO 8601: "YYYY-MM-DD" */
  editionDate: string;
  caderno: 2 | 3;
  status: 'pending' | 'downloading' | 'parsing' | 'completed' | 'failed';
  publicationCount: number | null;
  errorMessage: string | null;
}

/** Parâmetros de entrada para busca de publicações DJE */
export interface DjeSearchParams {
  term: string;
  /** Data inicial no formato "YYYY-MM-DD" */
  dateFrom: string;
  /** Data final no formato "YYYY-MM-DD" */
  dateTo: string;
}

/** Resultado individual de uma busca no DJE */
export interface DjeSearchResult {
  id: string;
  processNumber: string;
  instance: '1' | '2';
  court: string | null;
  /** Data de publicação no formato "YYYY-MM-DD" */
  publicationDate: string;
  caderno: 2 | 3;
  /** Trecho do conteúdo com termos destacados em `<mark>...</mark>` (ts_headline) */
  snippet: string;
}

/** Resposta paginada de uma busca no DJE */
export interface DjeSearchResponse {
  searchId: string;
  results: DjeSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

/** Registro de histórico de busca DJE de um usuário */
export interface DjeSearch {
  id: string;
  userId: string;
  name: string | null;
  term: string;
  /** Data inicial no formato "YYYY-MM-DD" */
  dateFrom: string;
  /** Data final no formato "YYYY-MM-DD" */
  dateTo: string;
  totalResults: number;
  executedAt: string;
  createdAt: string;
}
