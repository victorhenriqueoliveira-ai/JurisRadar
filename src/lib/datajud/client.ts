import { buildDataJudQuery } from './query-builder';
import {
  DataJudRateLimitError,
  DataJudUnavailableError,
  type ProcessoResult,
  type SearchFilters,
} from './types';

// ── Configuração ──────────────────────────────────────────────────────────────

const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';
const MAX_RETRIES = 3;
const BACKOFF_DELAYS_MS = [1000, 2000, 4000]; // backoff exponencial

function getApiKey(): string {
  const key = process.env.DATAJUD_API_KEY;
  if (!key) {
    throw new Error(
      'Variável de ambiente DATAJUD_API_KEY não configurada. ' +
        'Defina-a no .env.local ou nas variáveis de ambiente do ambiente de execução.',
    );
  }
  return key;
}

// ── Tipos internos de resposta DataJud ───────────────────────────────────────

interface DataJudMovimento {
  dataHora?: string;
  nome?: string;
  complementosTabelados?: Array<{ nome?: string; descricao?: string }>;
  [key: string]: unknown;
}

interface DataJudHit {
  _source?: {
    numeroProcesso?: string;
    tribunal?: string;
    grau?: string;
    classe?: { nome?: string; codigo?: number };
    assuntos?: Array<{ nome?: string; codigo?: number }>;
    dataAjuizamento?: string;
    orgaoJulgador?: { nome?: string };
    movimentos?: DataJudMovimento[];
  };
}

interface DataJudResponse {
  hits?: {
    total?: { value?: number } | number;
    hits?: DataJudHit[];
  };
}

// ── Mapeamento de resposta ────────────────────────────────────────────────────

/**
 * Mapeia um hit da resposta DataJud para ProcessoResult.
 * Descarta CPF/CNPJ das partes (LGPD — minimização de dados).
 */
function mapHitToProcesso(hit: DataJudHit): ProcessoResult | null {
  const src = hit._source;
  if (!src?.numeroProcesso) return null;

  let ultimaMovimentacao: ProcessoResult['ultimaMovimentacao'];
  if (src.movimentos && src.movimentos.length > 0) {
    const mov = src.movimentos[0];
    const descricao =
      mov.nome ??
      mov.complementosTabelados?.[0]?.nome ??
      mov.complementosTabelados?.[0]?.descricao ??
      '';
    if (mov.dataHora && descricao) {
      ultimaMovimentacao = { data: mov.dataHora, descricao };
    }
  }

  return {
    numero: src.numeroProcesso,
    tribunal: src.tribunal ?? '',
    grau: src.grau ?? '',
    classe: src.classe?.nome,
    assunto: src.assuntos?.[0]?.nome,
    dataDistribuicao: src.dataAjuizamento,
    orgaoJulgador: src.orgaoJulgador?.nome,
    ultimaMovimentacao,
  };
}

// ── Utilitários de retry ──────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Cliente principal ─────────────────────────────────────────────────────────

/**
 * Consulta a API DataJud de um tribunal específico com os filtros fornecidos.
 *
 * Implementa retry com backoff exponencial:
 *   - 3 tentativas, delays de 1s / 2s / 4s
 *   - 429 → aguarda Retry-After antes de retentar (lança DataJudRateLimitError)
 *   - 5xx → backoff exponencial (lança DataJudUnavailableError após esgotamento)
 *   - 4xx (exceto 429) → não retenta; relança o erro imediatamente
 *
 * @param tribunal  Alias do tribunal, ex: "api_publica_tjsp"
 * @param filters   Filtros da busca
 * @param from      Offset de paginação (padrão: 0)
 * @param size      Número de resultados por página (padrão: 100)
 */
export async function queryTribunal(
  tribunal: string,
  filters: SearchFilters,
  from: number = 0,
  size: number = 100,
): Promise<{ hits: ProcessoResult[]; total: number }> {
  const apiKey = getApiKey();
  const url = `${DATAJUD_BASE_URL}/${tribunal}/_search`;
  const body = buildDataJudQuery(filters, from, size);

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `APIKey ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = (await response.json()) as DataJudResponse;
        const hits = data.hits?.hits ?? [];
        const total =
          typeof data.hits?.total === 'object'
            ? (data.hits.total.value ?? 0)
            : (data.hits?.total ?? 0);

        const processos = hits
          .map((hit) => mapHitToProcesso(hit))
          .filter((p): p is ProcessoResult => p !== null);

        return { hits: processos, total };
      }

      // 429 — rate limit
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
        const retryAfterMs = isNaN(retryAfterSec) ? 60000 : retryAfterSec * 1000;

        await sleep(retryAfterMs);
        lastError = new DataJudRateLimitError(retryAfterSec);
        continue;
      }

      // 4xx (exceto 429) — não retenta
      if (response.status >= 400 && response.status < 500) {
        throw new Error(
          `DataJud retornou ${response.status} para o tribunal ${tribunal} — sem retry`,
        );
      }

      // 5xx — backoff exponencial
      if (response.status >= 500) {
        const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
        lastError = new DataJudUnavailableError(
          `DataJud indisponível (${response.status}) para ${tribunal}`,
          response.status,
        );
        if (attempt < MAX_RETRIES - 1) {
          await sleep(delay);
        }
        continue;
      }
    } catch (error) {
      // Erros de rede — trata como 5xx
      if (error instanceof DataJudRateLimitError || error instanceof DataJudUnavailableError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('sem retry')) {
        throw error;
      }
      const delay = BACKOFF_DELAYS_MS[attempt] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
      lastError = new DataJudUnavailableError(
        `Erro de rede ao consultar DataJud para ${tribunal}: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (attempt < MAX_RETRIES - 1) {
        await sleep(delay);
      }
    }
  }

  // Esgotou retries
  throw (
    lastError ??
    new DataJudUnavailableError(
      `Falha ao consultar DataJud para ${tribunal} após ${MAX_RETRIES} tentativas`,
    )
  );
}
