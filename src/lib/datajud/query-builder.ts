import type { SearchFilters } from './types';

// ── Tipos auxiliares do DSL ───────────────────────────────────────────────────

interface MatchClause {
  match: Record<string, string | { query: string; operator?: 'and' | 'or' }>;
}

interface TermClause {
  term: Record<string, string>;
}

interface TermsClause {
  terms: Record<string, string[]>;
}

interface RangeClause {
  range: Record<string, { gte?: string; lte?: string }>;
}

interface MultiMatchClause {
  multi_match: {
    query: string;
    fields: string[];
    type?: string;
    operator?: string;
  };
}

interface MatchPhraseClause {
  match_phrase: Record<string, string>;
}

interface SimpleQueryStringClause {
  simple_query_string: {
    query: string;
    fields: string[];
    default_operator: 'OR' | 'AND';
  };
}

type MustClause = MatchClause | TermClause | TermsClause | RangeClause | MultiMatchClause | MatchPhraseClause | SimpleQueryStringClause;

interface BoolQuery {
  bool: {
    must: MustClause[];
  };
}

interface MatchAllQuery {
  match_all: Record<string, never>;
}

export interface DataJudQuery {
  size: number;
  from: number;
  query: BoolQuery | MatchAllQuery;
}

// ── Stopwords PT-BR ──────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'ao', 'aos', 'as', 'à', 'às',
  'com', 'como',
  'da', 'das', 'de', 'do', 'dos',
  'e', 'em', 'entre', 'é',
  'mas', 'me', 'muito',
  'na', 'nas', 'nem', 'no', 'nos', 'num', 'numa',
  'o', 'os', 'ou',
  'para', 'pela', 'pelas', 'pelo', 'pelos', 'por',
  'que',
  'se', 'sem',
  'um', 'uma', 'uns', 'umas',
]);

// Prefixos de logradouro e bairro que indicam que as próximas palavras formam uma frase
// Logradouros: avenida paulista, rua augusta...
// Bairros/fóruns: jardim bela vista, vila mariana, fórum da barra funda...
const PHRASE_PREFIX_RE =
  /\b(avenida|av\.?|rua|r\.?|alameda|al\.?|praça|pça\.?|travessa|tv\.?|estrada|est\.?|rodovia|rod\.?|largo|lg\.?|beco|viela|via|jardim|jd\.?|vila|vl\.?|bairro|fórum|forum|foro|parque|pq\.?|conjunto|núcleo)\s+(\w+(?:\s+\w+)?)/gi;

/**
 * Detecta padrões de endereço/bairro/fórum e envolve em aspas para phrase query.
 * Exemplos: "avenida paulista" → '"avenida paulista"'
 *           "jardim bela vista" → '"jardim bela vista"'
 *           "fórum regional" → '"fórum regional"'
 * Isso impede falsos positivos onde cada palavra bate em campos diferentes.
 */
function wrapAddressPhrases(query: string): string {
  // Não altera se o usuário já usou aspas
  if (query.includes('"')) return query;
  return query.replace(PHRASE_PREFIX_RE, (match) => `"${match.trim()}"`);
}

/**
 * Remove stopwords PT-BR de segmentos não-quotados e descarta tokens curtos.
 * Preserva intactos os trechos entre aspas (frases exatas).
 */
function stripStopwords(query: string): string {
  // Divide em segmentos: ímpares são trechos entre aspas (preservados)
  const segments = query.split(/("(?:[^"]+)")/);
  return segments
    .map((seg, idx) => {
      if (idx % 2 === 1) return seg; // dentro de aspas — mantém
      return seg
        .trim()
        .split(/\s+/)
        .filter((t) => {
          if (!t) return false;
          const lower = t.toLowerCase().replace(/[.,;:!?]/g, '');
          return lower.length > 1 && !STOPWORDS.has(lower);
        })
        .join(' ');
    })
    .filter(Boolean)
    .join(' ')
    .trim();
}

// ── Builder principal ─────────────────────────────────────────────────────────

/**
 * Constrói a query Elasticsearch DSL a partir dos SearchFilters fornecidos.
 *
 * Mapeamento (campos reais da API DataJud v2):
 *   assunto[]            → match assuntos.nome
 *   classe[]             → match classe.nome
 *   grau[]               → match grau  (campo text, não keyword)
 *   dataDistribuicaoInicio / Fim → range dataAjuizamento (formato yyyyMMddHHmmss)
 *   buscaLivre           → multi_match em assuntos.nome, classe.nome, orgaoJulgador.nome
 */
export function buildDataJudQuery(
  filters: SearchFilters,
  from: number = 0,
  size: number = 100,
): DataJudQuery {
  // Número de processo: busca exata, ignora todos os outros filtros
  // Remove pontos e traços — o DataJud indexa o número sem formatação
  if (filters.numeroProcesso) {
    const numeroLimpo = filters.numeroProcesso.trim().replace(/[.\-]/g, '');
    return {
      size,
      from,
      query: {
        bool: {
          must: [{ match_phrase: { numeroProcesso: numeroLimpo } }],
        },
      },
    };
  }

  const must: MustClause[] = [];

  // assunto: busca textual em assuntos.nome
  if (filters.assunto && filters.assunto.length > 0) {
    for (const assunto of filters.assunto) {
      must.push({
        match: { 'assuntos.nome': assunto },
      });
    }
  }

  // classe: nome da classe processual CNJ
  if (filters.classe && filters.classe.length > 0) {
    for (const classe of filters.classe) {
      must.push({
        match: { 'classe.nome': classe },
      });
    }
  }

  // grau: G1, G2, JE, SUP — campo text, usa match (não term/terms)
  if (filters.grau && filters.grau.length > 0) {
    for (const grau of filters.grau) {
      must.push({
        match: { grau },
      });
    }
  }

  // data de distribuição: range em dataAjuizamento (formato yyyyMMddHHmmss)
  if (filters.dataDistribuicaoInicio || filters.dataDistribuicaoFim) {
    const rangeFilter: { gte?: string; lte?: string } = {};
    if (filters.dataDistribuicaoInicio) {
      // converte "2026-01-01" → "20260101000000"
      rangeFilter.gte = filters.dataDistribuicaoInicio.replace(/-/g, '') + '000000';
    }
    if (filters.dataDistribuicaoFim) {
      rangeFilter.lte = filters.dataDistribuicaoFim.replace(/-/g, '') + '235959';
    }
    must.push({
      range: { dataAjuizamento: rangeFilter },
    });
  }

  // OAB: match em advogados.numeroOAB (nested field no DataJud)
  if (filters.oabNumero) {
    must.push({ match: { 'advogados.numeroOAB': filters.oabNumero } });
  }

  // comarca/cidade: todas as palavras devem aparecer no nome do órgão julgador.
  // operator "and" evita que "capão redondo" case com "Capão Bonito" (só "capão" em comum).
  if (filters.comarca) {
    must.push({
      match: {
        'orgaoJulgador.nome': { query: filters.comarca, operator: 'and' },
      },
    });
  }

  // busca livre: simple_query_string em todos os campos indexados do documento
  // Endereços ("avenida paulista") são envolvidos em aspas para busca de frase,
  // evitando que "paulista" em "Vara de Várzea Paulista" satisfaça o critério.
  if (filters.buscaLivre) {
    const comFrases = wrapAddressPhrases(filters.buscaLivre);
    const termos = stripStopwords(comFrases);
    if (termos) {
      must.push({
        simple_query_string: {
          query: termos,
          fields: ['*'],
          default_operator: 'AND',
        },
      });
    }
  }

  // Se nenhum filtro foi aplicado, retorna match_all
  if (must.length === 0) {
    return {
      size,
      from,
      query: { match_all: {} as Record<string, never> },
    };
  }

  return {
    size,
    from,
    query: { bool: { must } },
  };
}
