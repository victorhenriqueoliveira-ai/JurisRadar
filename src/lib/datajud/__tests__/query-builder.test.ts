import { describe, it, expect } from 'vitest';
import { buildDataJudQuery } from '../query-builder';

/**
 * Testes atualizados para o query-builder após fix(datajud): corrigir campos da API DataJud v2.
 * Campos reais da API (raiz do documento, sem dadosBasicos):
 *   assunto → assuntos.nome (match)
 *   classe  → classe.nome  (match)
 *   grau    → grau         (match, campo text — não keyword)
 *   data    → dataAjuizamento (range, formato yyyyMMddHHmmss)
 *   busca   → simple_query_string em todos os campos ('*')
 */
describe('buildDataJudQuery', () => {
  it('com filtros vazios retorna query match_all', () => {
    const query = buildDataJudQuery({});
    expect(query.query).toHaveProperty('match_all');
    expect(query.size).toBe(100);
    expect(query.from).toBe(0);
  });

  it('com assunto único gera match no campo assuntos.nome', () => {
    const query = buildDataJudQuery({ assunto: ['pensão alimentícia'] });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      match: { 'assuntos.nome': 'pensão alimentícia' },
    });
  });

  it('com grau único gera match no campo grau (campo text, não keyword)', () => {
    const query = buildDataJudQuery({ grau: ['G1'] });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      match: { grau: 'G1' },
    });
  });

  it('com múltiplos graus gera um match por grau (campo text)', () => {
    const query = buildDataJudQuery({ grau: ['G1', 'G2'] });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({ match: { grau: 'G1' } });
    expect(must).toContainEqual({ match: { grau: 'G2' } });
    expect(must).toHaveLength(2);
  });

  it('com dataDistribuicaoInicio e dataDistribuicaoFim gera range em dataAjuizamento (yyyyMMddHHmmss)', () => {
    const query = buildDataJudQuery({
      dataDistribuicaoInicio: '2025-01-01',
      dataDistribuicaoFim: '2026-01-01',
    });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      range: {
        dataAjuizamento: {
          gte: '20250101000000',
          lte: '20260101235959',
        },
      },
    });
  });

  it('com apenas dataDistribuicaoInicio gera range somente com gte', () => {
    const query = buildDataJudQuery({ dataDistribuicaoInicio: '2025-01-01' });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({
      range: {
        dataAjuizamento: {
          gte: '20250101000000',
        },
      },
    });
  });

  it('com buscaLivre gera simple_query_string em todos os campos', () => {
    const query = buildDataJudQuery({ buscaLivre: 'alimentos criança' });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    const sqsClause = must.find(
      (c) => Object.prototype.hasOwnProperty.call(c, 'simple_query_string'),
    ) as { simple_query_string: { query: string; fields: string[]; default_operator: string } };
    expect(sqsClause).toBeDefined();
    expect(sqsClause.simple_query_string.query).toBe('alimentos criança');
    expect(sqsClause.simple_query_string.fields).toContain('*');
    expect(sqsClause.simple_query_string.default_operator).toBe('AND');
  });

  it('respeita parâmetros from e size', () => {
    const query = buildDataJudQuery({}, 50, 10);
    expect(query.from).toBe(50);
    expect(query.size).toBe(10);
  });

  it('com classe gera match no campo classe.nome', () => {
    const query = buildDataJudQuery({ classe: ['Ação Civil', 'Execução'] });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toContainEqual({ match: { 'classe.nome': 'Ação Civil' } });
    expect(must).toContainEqual({ match: { 'classe.nome': 'Execução' } });
  });

  it('com numeroProcesso retorna query match_phrase exata e ignora demais filtros', () => {
    const query = buildDataJudQuery({
      numeroProcesso: '0001234-56.2025.8.26.0001',
      grau: ['G1'],
    });
    const must = (query.query as { bool: { must: unknown[] } }).bool.must;
    expect(must).toHaveLength(1);
    expect(must[0]).toMatchObject({
      match_phrase: { numeroProcesso: expect.any(String) },
    });
  });
});
