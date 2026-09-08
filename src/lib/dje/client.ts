/**
 * DJE/TJSP Client — download de PDF de cadernos do Diário da Justiça Eletrônico.
 *
 * URL confirmada empiricamente em 2026-08-07:
 *   https://dje.tjsp.jus.br/cdje/downloadCaderno.do?dtDiario=DD%2FMM%2FYYYY&cdCaderno={n}&tpDownload=D
 *
 * Mapeamento de cadernos (obtido da página index.do do portal):
 *   Caderno 2 (2ª Instância) → cdCaderno=11
 *   Caderno 3 (1ª Instância Capital, Parte I) → cdCaderno=12
 *
 * O parâmetro tpDownload=D é obrigatório; sem ele o servidor retorna HTML de erro.
 * A data deve ser enviada no formato DD/MM/YYYY com as barras codificadas como %2F.
 * Resposta de sucesso: Content-Type application/octet-stream, PDF com magic bytes %PDF.
 *
 * NOTA: A URL acima está INATIVA desde 22/07/2025 (nuDiario 4247).
 * O TJSP migrou para o DEJESP (ver searchDejesp abaixo).
 */

// ── Erros tipados ─────────────────────────────────────────────────────────────

export class DjeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DjeNotFoundError';
  }
}

export class DjeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DjeUnavailableError';
  }
}

// ── Configuração ──────────────────────────────────────────────────────────────

const DJE_BASE_URL = 'https://dje.tjsp.jus.br/cdje/downloadCaderno.do';
const MAX_RETRIES = 3;
/** Backoff exponencial: 5s, 15s, 45s */
const BACKOFF_DELAYS_MS = [5_000, 15_000, 45_000] as const;

/**
 * Mapeamento de número de caderno (2 ou 3) para o código interno do portal DJE.
 * Confirmado na página https://dje.tjsp.jus.br/cdje/index.do (select#cadernosCad).
 */
const CADERNO_CODES: Record<2 | 3, number> = {
  2: 11, // Caderno 2 — Judicial — 2ª Instância
  3: 12, // Caderno 3 — Judicial — 1ª Instância Capital — Parte I
};

// ── Utilitários ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converte data de YYYY-MM-DD para DD/MM/YYYY e codifica as barras para URL.
 * Ex.: "2026-08-07" → "07%2F08%2F2026"
 */
function formatDateForUrl(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}%2F${month}%2F${year}`;
}

function buildUrl(caderno: 2 | 3, date: string): string {
  const cdCaderno = CADERNO_CODES[caderno];
  const dtDiario = formatDateForUrl(date);
  return `${DJE_BASE_URL}?dtDiario=${dtDiario}&cdCaderno=${cdCaderno}&tpDownload=D`;
}

// ── Cliente principal ─────────────────────────────────────────────────────────

/**
 * Baixa o PDF de um caderno do DJE/TJSP para a data informada.
 *
 * @param caderno  Número do caderno: 2 (2ª Instância) ou 3 (1ª Instância Capital)
 * @param date     Data no formato ISO 8601 "YYYY-MM-DD"
 * @returns        Buffer contendo o PDF (magic bytes %PDF)
 *
 * @throws {DjeNotFoundError}      HTTP 404 — edição não disponível para a data
 * @throws {DjeUnavailableError}   HTTP 5xx / timeout / 4xx != 404 após esgotamento de retries
 *
 * Estratégia de retry:
 *   - Até 3 tentativas com delays de 5s, 15s e 45s (backoff exponencial)
 *   - HTTP 404 → falha imediata sem retry
 *   - HTTP 5xx ou TypeError de rede → retryable
 *   - HTTP 4xx != 404 → falha imediata sem retry
 */
export async function downloadCaderno(caderno: 2 | 3, date: string): Promise<Buffer> {
  const url = buildUrl(caderno, date);
  console.log(`[dje-client] download started caderno=${caderno} date=${date}`);

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/pdf,application/octet-stream,*/*',
          Referer: 'https://dje.tjsp.jus.br/cdje/index.do',
        },
      });

      // HTTP 404 — edição não disponível, sem retry
      if (response.status === 404) {
        throw new DjeNotFoundError(
          `DJE: caderno ${caderno} não encontrado para a data ${date} (HTTP 404)`,
        );
      }

      // HTTP 4xx != 404 — erro do cliente sem retry
      if (response.status >= 400 && response.status < 500) {
        throw new DjeUnavailableError(
          `DJE: resposta inesperada HTTP ${response.status} para caderno ${caderno} em ${date}`,
        );
      }

      // HTTP 5xx — retryable
      if (response.status >= 500) {
        const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
        lastError = new DjeUnavailableError(
          `DJE: serviço indisponível (HTTP ${response.status}) para caderno ${caderno} em ${date}`,
        );
        if (attempt < MAX_RETRIES - 1) {
          await sleep(delay);
        }
        continue;
      }

      // HTTP 2xx — sucesso
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[dje-client] download completed ${buffer.byteLength} bytes`);
        return buffer;
      }

      // Status inesperado (1xx, 3xx sem redirect, etc.)
      lastError = new DjeUnavailableError(
        `DJE: resposta inesperada HTTP ${response.status} para caderno ${caderno} em ${date}`,
      );
    } catch (error) {
      // Propaga erros não-retryable imediatamente
      if (error instanceof DjeNotFoundError || error instanceof DjeUnavailableError) {
        throw error;
      }

      // TypeError de rede (fetch falhou) — retryable
      const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
      lastError = new DjeUnavailableError(
        `DJE: erro de rede ao baixar caderno ${caderno} em ${date}: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (attempt < MAX_RETRIES - 1) {
        await sleep(delay);
      }
    }
  }

  // Esgotou as tentativas
  throw (
    lastError ??
    new DjeUnavailableError(
      `DJE: falha ao baixar caderno ${caderno} em ${date} após ${MAX_RETRIES} tentativas`,
    )
  );
}

// ── DEJESP — busca full-text (novo portal TJSP) ───────────────────────────────

const DEJESP_API = 'https://www.tjsp.jus.br/atcapi/dje/v1';

/**
 * Última edição com cadernos judiciais no DEJESP.
 * Após 2025-07-22, apenas o Caderno 1 Administrativo está disponível.
 */
export const DEJESP_JUDICIAL_CUTOFF = '2025-07-22';

export interface DejespSearchParams {
  term: string;
  dateFrom: string;
  dateTo: string;
  /** Filtro post-fetch: foro/vara que deve aparecer na página da publicação */
  court?: string;
  skip?: number;
  take?: number;
}

export interface DejespPageResult {
  /** ID original da API: "{date}-{idEdicao}-{idVolume}-{idCaderno}-{page}" */
  id: string;
  publicationDate: string;
  /** Números de processo extraídos do texto da página (CNJ format) */
  processNumbers: string[];
  /** Texto completo da página — contém múltiplos processos */
  texto: string;
  /** true se o filtro de foro foi aplicado e bateu */
  courtMatched: boolean;
}

export interface DejespSearchResult {
  pages: DejespPageResult[];
  /** Total retornado pela API (antes do filtro court) */
  totalFromApi: number;
  /** Total após aplicar filtro court (se fornecido) */
  total: number;
  /** true se dateTo foi truncado ao cutoff judicial */
  truncatedToJudicialCutoff: boolean;
}

const PROCESSO_REGEX = /PROCESSO\s*:\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;

function extractProcessNumbers(texto: string): string[] {
  const matches = [...texto.matchAll(PROCESSO_REGEX)];
  return matches.map((m) => m[1]);
}

/**
 * Busca publicações no DEJESP (portal TJSP) via full-text search.
 *
 * Cobre dados judiciais até 22/07/2025 (última edição com cadernos judiciais).
 * O filtro `court` é aplicado post-fetch: verifica se o nome do foro/vara
 * aparece em qualquer parte do texto da página.
 */
export async function searchDejesp(params: DejespSearchParams): Promise<DejespSearchResult> {
  const { term, court } = params;
  const skip = params.skip ?? 0;
  const take = params.take ?? 20;

  // Aplica cutoff: dados judiciais só existem até 22/07/2025
  const effectiveDateTo =
    params.dateTo > DEJESP_JUDICIAL_CUTOFF ? DEJESP_JUDICIAL_CUTOFF : params.dateTo;
  const truncated = params.dateTo > DEJESP_JUDICIAL_CUTOFF;

  // Se o range completo é após o cutoff, retorna vazio
  if (params.dateFrom > DEJESP_JUDICIAL_CUTOFF) {
    return { pages: [], totalFromApi: 0, total: 0, truncatedToJudicialCutoff: true };
  }

  const body = {
    dataInicio: params.dateFrom,
    dataFim: effectiveDateTo,
    palavrasChave: term,
    skip,
    take,
  };

  const response = await fetch(`${DEJESP_API}/caderno/paginado/pesquisa-avancada`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; JurisRadar/1.0)',
      Referer: 'https://www.tjsp.jus.br/atc/dejesp/',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new DjeUnavailableError(
      `DEJESP: erro HTTP ${response.status} na busca por "${term}"`,
    );
  }

  const data = (await response.json()) as {
    dados: Array<{ id: string; texto: string }>;
    totalElementos: number;
    totalPaginas: number;
  };

  const rawPages = data.dados ?? [];
  const totalFromApi = data.totalElementos ?? 0;

  // Extrai data da publicação do campo id: "{date}-{rest}"
  const pages: DejespPageResult[] = rawPages
    .map((item) => {
      const datePart = item.id?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
      const processNumbers = extractProcessNumbers(item.texto ?? '');
      const courtMatched = court
        ? (item.texto ?? '').toLowerCase().includes(court.toLowerCase())
        : true;
      return {
        id: item.id,
        publicationDate: datePart,
        processNumbers,
        texto: item.texto ?? '',
        courtMatched,
      };
    })
    .filter((p) => p.courtMatched);

  return {
    pages,
    totalFromApi,
    total: court ? pages.length : totalFromApi,
    truncatedToJudicialCutoff: truncated,
  };
}
