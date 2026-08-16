import type { SearchFilters } from './types';

// ── Tipos auxiliares do DSL ───────────────────────────────────────────────────

interface MatchClause {
  match: Record<string, string>;
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

type MustClause = MatchClause | TermClause | TermsClause | RangeClause | MultiMatchClause | MatchPhraseClause;

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

/**
 * Remove stopwords do PT-BR antes de enviar para o Elasticsearch.
 * Mantém termos com menos de 2 caracteres só se forem números.
 */
function stripStopwords(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter((t) => {
      const lower = t.toLowerCase().replace(/[.,;:!?]/g, '');
      return lower.length > 1 && !STOPWORDS.has(lower);
    })
    .join(' ');
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

  // comarca/cidade: match em orgaoJulgador.nome (ex: "Campinas" filtra varas de Campinas)
  if (filters.comarca) {
    must.push({ match: { 'orgaoJulgador.nome': filters.comarca } });
  }

  // busca livre: cross_fields em assunto + classe + comarca + partes num único campo
  // Remove stopwords: "despejo no jardim bela vista" → "despejo jardim bela vista"
  // partes.nome permite buscar por nome de banco, empresa ou pessoa (polo ativo/passivo)
  if (filters.buscaLivre) {
    const termos = stripStopwords(filters.buscaLivre);
    if (termos) {
      must.push({
        multi_match: {
          query: termos,
          fields: ['assuntos.nome', 'classe.nome', 'orgaoJulgador.nome', 'partes.nome'],
          type: 'cross_fields',
          operator: 'or',
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
