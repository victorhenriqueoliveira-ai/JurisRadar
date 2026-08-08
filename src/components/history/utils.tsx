/**
 * Utilitários para o histórico de buscas DJE.
 * Funções puras extraídas do componente para permitir testes unitários em
 * ambiente node (sem DOM).
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DjeSearchItem {
  id: string;
  term: string;
  dateFrom: string;   // "YYYY-MM-DD"
  dateTo: string;     // "YYYY-MM-DD"
  totalResults: number;
  executedAt: string; // ISO datetime
  createdAt: string;
}

export interface DjeSearchListResponse {
  searches: DjeSearchItem[];
  total: number;
}

// ── Formatação de datas ───────────────────────────────────────────────────────

/**
 * Formata uma data no formato "YYYY-MM-DD" para "DD/MM/YYYY".
 * Usa UTC para evitar shifts de fuso horário local.
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata um ISO datetime para "DD/MM/YYYY HH:mm" (fuso UTC).
 */
export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formata o período de uma busca como "DD/MM/YYYY a DD/MM/YYYY".
 */
export function formatPeriod(dateFrom: string, dateTo: string): string {
  return `${formatDate(dateFrom)} a ${formatDate(dateTo)}`;
}

// ── Construtores de URL ───────────────────────────────────────────────────────

/**
 * Constrói a URL do endpoint de exportação CSV de uma busca.
 */
export function buildExportUrl(searchId: string): string {
  return `/api/dje/searches/${searchId}/export`;
}

/**
 * Constrói a URL de navegação após rerun bem-sucedido.
 */
export function buildRerunUrl(newSearchId: string): string {
  return `/dje?searchId=${newSearchId}`;
}

// ── Chamadas à API ────────────────────────────────────────────────────────────

/**
 * Busca o histórico paginado de buscas DJE do usuário autenticado.
 */
export async function fetchDjeSearchHistory(
  page: number,
  limit: number,
): Promise<DjeSearchListResponse> {
  const response = await fetch(`/api/dje/searches?page=${page}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Erro ao carregar histórico de buscas');
  }
  return response.json() as Promise<DjeSearchListResponse>;
}

/**
 * Executa o rerun de uma busca DJE e retorna o novo searchId.
 */
export async function rerunDjeSearch(searchId: string): Promise<string> {
  const response = await fetch(`/api/dje/searches/${searchId}/rerun`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Erro ao reexecutar busca');
  }
  const data = (await response.json()) as { searchId: string };
  return data.searchId;
}

// ── Download CSV ──────────────────────────────────────────────────────────────

/**
 * Dispara o download de CSV via elemento <a> temporário.
 * Não navega para fora da página atual.
 *
 * O parâmetro `doc` é injetável para facilitar testes unitários;
 * em produção usa `document` do browser.
 */
export function triggerCsvDownload(
  searchId: string,
  doc: Pick<Document, 'createElement' | 'body'> = document,
): void {
  const a = doc.createElement('a') as HTMLAnchorElement;
  a.href = buildExportUrl(searchId);
  a.download = `dje-${searchId}.csv`;
  doc.body.appendChild(a);
  a.click();
  doc.body.removeChild(a);
}
