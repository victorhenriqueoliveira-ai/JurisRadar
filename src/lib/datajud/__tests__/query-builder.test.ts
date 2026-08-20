import { describe, it, expect } from 'vitest';
import { buildDataJudQuery } from '../query-builder';

describe('buildDataJudQuery', () => {
  it('com filtros vazios retorna query match_all', () => {
    const query = buildDataJudQuery({});
    expect(query.query).toHaveProperty('match_all');
    expect(query.size).toBe(100);
    expect(query.from).toBe(0);
  });

  it('com assunto único gera match no campo correto do DSL', () => {
    const query = buildDataJudQuery({ assunto: ['pensão alimentícia'] });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      match: { 'dadosBasicos.assunto.descricao': 'pensão alimentícia' },
    });
  });

  it('com grau único gera term no campo dadosBasicos.grau', () => {
    const query = buildDataJudQuery({ grau: ['G1'] });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      term: { 'dadosBasicos.grau': 'G1' },
    });
  });

  it('com múltiplos graus gera terms no campo dadosBasicos.grau', () => {
    const query = buildDataJudQuery({ grau: ['G1', 'G2'] });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      terms: { 'dadosBasicos.grau': ['G1', 'G2'] },
    });
  });

  it('com dataDistribuicaoInicio e dataDistribuicaoFim gera range correto', () => {
    const query = buildDataJudQuery({
      dataDistribuicaoInicio: '2025-01-01',
      dataDistribuicaoFim: '2026-01-01',
    });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      range: {
        'dadosBasicos.dataAjuizamento': {
          gte: '2025-01-01',
          lte: '2026-01-01',
        },
      },
    });
  });

  it('com apenas dataDistribuicaoInicio gera range somente com gte', () => {
    const query = buildDataJudQuery({ dataDistribuicaoInicio: '2025-01-01' });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      range: {
        'dadosBasicos.dataAjuizamento': {
          gte: '2025-01-01',
        },
      },
    });
  });

  it('com buscaLivre gera multi_match nos campos corretos', () => {
    const query = buildDataJudQuery({ buscaLivre: 'alimentos criança' });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    const multiMatch = must.find((c) => Object.prototype.hasOwnProperty.call(c, 'multi_match')) as {
      multi_match: { query: string; fields: string[] };
    };
    expect(multiMatch).toBeDefined();
    expect(multiMatch.multi_match.query).toBe('alimentos criança');
    expect(multiMatch.multi_match.fields).toContain('dadosBasicos.assunto.descricao');
  });

  it('respeita parâmetros from e size', () => {
    const query = buildDataJudQuery({}, 50, 10);
    expect(query.from).toBe(50);
    expect(query.size).toBe(10);
  });

  it('com classe gera terms no campo dadosBasicos.classe.codigo', () => {
    const query = buildDataJudQuery({ classe: ['123', '456'] });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      terms: { 'dadosBasicos.classe.codigo': ['123', '456'] },
    });
  });
});
