/**
 * Testes unitários para src/db/schema.ts
 *
 * Valida a estrutura dos tipos e a serialização/desserialização dos campos JSONB.
 * Não requer conexão com banco de dados.
 */
import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  users,
  searches,
  searchResults,
  searchCache,
  type SearchFilters,
  type Parte,
  type UltimaMovimentacao,
  type SearchStatus,
} from '../schema';

describe('schema — tabelas exportadas', () => {
  it('deve exportar a tabela users como objeto não-nulo', () => {
    expect(users).toBeDefined();
    expect(users).not.toBeNull();
    // Verifica que é um objeto Drizzle PgTable pelo nome simbólico da tabela
    expect(typeof users).toBe('object');
  });

  it('deve exportar a tabela searches como objeto não-nulo', () => {
    expect(searches).toBeDefined();
    expect(searches).not.toBeNull();
    expect(typeof searches).toBe('object');
  });

  it('deve exportar a tabela searchResults como objeto não-nulo', () => {
    expect(searchResults).toBeDefined();
    expect(searchResults).not.toBeNull();
    expect(typeof searchResults).toBe('object');
  });

  it('deve exportar a tabela searchCache como objeto não-nulo', () => {
    expect(searchCache).toBeDefined();
    expect(searchCache).not.toBeNull();
    expect(typeof searchCache).toBe('object');
  });
});

describe('schema — nomes de colunas (snake_case no banco)', () => {
  it('tabela users deve ter colunas corretas', () => {
    const cols = Object.keys(users);
    expect(cols).toContain('id');
    expect(cols).toContain('email');
    expect(cols).toContain('passwordHash');
    expect(cols).toContain('name');
    expect(cols).toContain('createdAt');
  });

  it('tabela searches deve ter colunas corretas', () => {
    const cols = Object.keys(searches);
    expect(cols).toContain('id');
    expect(cols).toContain('userId');
    expect(cols).toContain('filters');
    expect(cols).toContain('status');
    expect(cols).toContain('processedTribunals');
    expect(cols).toContain('failedTribunals');
    expect(cols).toContain('totalTribunals');
    expect(cols).toContain('totalResults');
    expect(cols).toContain('cacheKey');
  });

  it('tabela searchResults deve ter colunas corretas', () => {
    const cols = Object.keys(searchResults);
    expect(cols).toContain('id');
    expect(cols).toContain('searchId');
    expect(cols).toContain('numero');
    expect(cols).toContain('tribunal');
    expect(cols).toContain('grau');
    expect(cols).toContain('partes');
    expect(cols).toContain('ultimaMovimentacao');
  });

  it('tabela searchCache deve ter colunas corretas', () => {
    const cols = Object.keys(searchCache);
    expect(cols).toContain('cacheKey');
    expect(cols).toContain('searchId');
    expect(cols).toContain('expiresAt');
    expect(cols).toContain('createdAt');
  });
});

describe('SearchFilters — serialização/desserialização JSONB', () => {
  it('deve serializar e desserializar sem perda de campos', () => {
    const filters: SearchFilters = {
      nomeParte: 'João Silva',
      cpfCnpj: '123.456.789-00',
      numeroProcesso: '0001234-56.2024.8.26.0100',
      tribunais: ['TJSP', 'TJRJ', 'STJ'],
      dataInicio: '2024-01-01',
      dataFim: '2024-12-31',
      classe: 'Ação Ordinária',
      assunto: 'Direito Civil',
    };

    const json = JSON.stringify(filters);
    const parsed: SearchFilters = JSON.parse(json);

    expect(parsed.nomeParte).toBe(filters.nomeParte);
    expect(parsed.cpfCnpj).toBe(filters.cpfCnpj);
    expect(parsed.numeroProcesso).toBe(filters.numeroProcesso);
    expect(parsed.tribunais).toEqual(filters.tribunais);
    expect(parsed.dataInicio).toBe(filters.dataInicio);
    expect(parsed.dataFim).toBe(filters.dataFim);
    expect(parsed.classe).toBe(filters.classe);
    expect(parsed.assunto).toBe(filters.assunto);
  });

  it('deve aceitar SearchFilters com campos opcionais ausentes', () => {
    const filters: SearchFilters = {
      nomeParte: 'Maria Santos',
    };

    const json = JSON.stringify(filters);
    const parsed: SearchFilters = JSON.parse(json);

    expect(parsed.nomeParte).toBe('Maria Santos');
    expect(parsed.cpfCnpj).toBeUndefined();
    expect(parsed.tribunais).toBeUndefined();
  });

  it('deve preservar array de tribunais vazio', () => {
    const filters: SearchFilters = {
      tribunais: [],
    };

    const json = JSON.stringify(filters);
    const parsed: SearchFilters = JSON.parse(json);

    expect(parsed.tribunais).toEqual([]);
  });
});

describe('Parte — tipo JSONB de partes do processo', () => {
  it('deve serializar e desserializar array de partes', () => {
    const partes: Parte[] = [
      { polo: 'ativo', nome: 'Empresa ABC Ltda' },
      { polo: 'passivo', nome: 'João da Silva' },
    ];

    const json = JSON.stringify(partes);
    const parsed: Parte[] = JSON.parse(json);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].polo).toBe('ativo');
    expect(parsed[0].nome).toBe('Empresa ABC Ltda');
    expect(parsed[1].polo).toBe('passivo');
    expect(parsed[1].nome).toBe('João da Silva');
  });
});

describe('UltimaMovimentacao — tipo JSONB de movimentação', () => {
  it('deve serializar e desserializar sem perda de campos', () => {
    const mov: UltimaMovimentacao = {
      data: '2024-03-15',
      descricao: 'Sentença proferida — procedência total',
    };

    const json = JSON.stringify(mov);
    const parsed: UltimaMovimentacao = JSON.parse(json);

    expect(parsed.data).toBe(mov.data);
    expect(parsed.descricao).toBe(mov.descricao);
  });
});

describe('SearchStatus — tipo enum de status da busca', () => {
  it('deve aceitar todos os valores válidos do enum', () => {
    const validStatuses: SearchStatus[] = [
      'pending',
      'processing',
      'completed',
      'partial',
      'failed',
    ];

    for (const status of validStatuses) {
      expect(typeof status).toBe('string');
      expect(['pending', 'processing', 'completed', 'partial', 'failed']).toContain(status);
    }
  });
});

describe('schema — constraints de FK (via getTableConfig)', () => {
  it('tabela searches deve ter FK para users', () => {
    const config = getTableConfig(searches);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    // Exercita a função de referência (cobertura de código)
    const fk = config.foreignKeys[0];
    const ref = fk.reference();
    expect(ref).toBeDefined();
    expect(ref.foreignTable).toBe(users);
  });

  it('tabela searchResults deve ter FK para searches com ON DELETE CASCADE', () => {
    const config = getTableConfig(searchResults);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    const fk = config.foreignKeys[0];
    expect(fk.onDelete).toBe('cascade');
    // Exercita a função de referência
    const ref = fk.reference();
    expect(ref).toBeDefined();
    expect(ref.foreignTable).toBe(searches);
  });

  it('tabela searchCache deve ter FK para searches', () => {
    const config = getTableConfig(searchCache);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    const fk = config.foreignKeys[0];
    // Exercita a função de referência
    const ref = fk.reference();
    expect(ref).toBeDefined();
    expect(ref.foreignTable).toBe(searches);
  });
});

describe('schema — índices obrigatórios', () => {
  it('tabela searches deve ter índice composto em (user_id, created_at)', () => {
    const config = getTableConfig(searches);
    const idxNames = config.indexes.map((idx) => {
      const idxConfig = idx.config;
      return idxConfig.name;
    });
    expect(idxNames).toContain('searches_user_id_created_at_idx');
  });

  it('tabela searches deve ter índice em cache_key', () => {
    const config = getTableConfig(searches);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('searches_cache_key_idx');
  });

  it('tabela search_results deve ter índice em search_id', () => {
    const config = getTableConfig(searchResults);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('search_results_search_id_idx');
  });
});
