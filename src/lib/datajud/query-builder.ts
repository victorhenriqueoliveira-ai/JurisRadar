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
  };
}

type MustClause = MatchClause | TermClause | TermsClause | RangeClause | MultiMatchClause;

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

// ── Builder principal ─────────────────────────────────────────────────────────

/**
 * Constrói a query Elasticsearch DSL a partir dos SearchFilters fornecidos.
 *
 * Mapeamento:
 *   assunto[]            → match dadosBasicos.assunto.descricao (OR entre valores)
 *   classe[]             → terms dadosBasicos.classe.codigo
 *   grau[]               → terms dadosBasicos.grau
 *   dataDistribuicaoInicio / Fim → range dadosBasicos.dataAjuizamento
 *   buscaLivre           → multi_match em campos relevantes
 */
export function buildDataJudQuery(
  filters: SearchFilters,
  from: number = 0,
  size: number = 100,
): DataJudQuery {
  const must: MustClause[] = [];

  // assunto: busca textual (match)
  if (filters.assunto && filters.assunto.length > 0) {
    if (filters.assunto.length === 1) {
      must.push({
        match: { 'dadosBasicos.assunto.descricao': filters.assunto[0] },
      });
    } else {
      // Múltiplos assuntos → terms no código ou match via bool should (simplificado: primeiro valor)
      for (const assunto of filters.assunto) {
        must.push({
          match: { 'dadosBasicos.assunto.descricao': assunto },
        });
      }
    }
  }

  // classe: código da classe processual CNJ
  if (filters.classe && filters.classe.length > 0) {
    must.push({
      terms: { 'dadosBasicos.classe.codigo': filters.classe },
    });
  }

  // grau: G1, G2, JE, SUP
  if (filters.grau && filters.grau.length > 0) {
    if (filters.grau.length === 1) {
      must.push({
        term: { 'dadosBasicos.grau': filters.grau[0] },
      });
    } else {
      must.push({
        terms: { 'dadosBasicos.grau': filters.grau },
      });
    }
  }

  // data de distribuição: range
  if (filters.dataDistribuicaoInicio || filters.dataDistribuicaoFim) {
    const rangeFilter: { gte?: string; lte?: string } = {};
    if (filters.dataDistribuicaoInicio) {
      rangeFilter.gte = filters.dataDistribuicaoInicio;
    }
    if (filters.dataDistribuicaoFim) {
      rangeFilter.lte = filters.dataDistribuicaoFim;
    }
    must.push({
      range: { 'dadosBasicos.dataAjuizamento': rangeFilter },
    });
  }

  // busca livre: multi_match em campos textuais relevantes
  if (filters.buscaLivre) {
    must.push({
      multi_match: {
        query: filters.buscaLivre,
        fields: [
          'dadosBasicos.assunto.descricao',
          'dadosBasicos.classe.descricao',
          'dadosBasicos.orgaoJulgador.nomeOrgao',
        ],
      },
    });
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
