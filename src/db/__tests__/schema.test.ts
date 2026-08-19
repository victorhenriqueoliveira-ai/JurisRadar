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
  organizations,
  orgMembers,
  subscriptions,
  processos,
  movimentacoes,
  notificacoes,
  honorarios,
  pagamentos,
  notasProcesso,
  eventosCalendario,
  djeSearches,
  type SearchFilters,
  type Parte,
  type UltimaMovimentacao,
  type SearchStatus,
} from '../schema';

// ── Tabelas existentes ────────────────────────────────────────────────────────

describe('schema — tabelas exportadas', () => {
  it('deve exportar a tabela users como objeto não-nulo', () => {
    expect(users).toBeDefined();
    expect(users).not.toBeNull();
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

// ── Novas tabelas SaaS ────────────────────────────────────────────────────────

describe('schema — novas tabelas SaaS exportadas', () => {
  it('deve exportar a tabela organizations como objeto não-nulo', () => {
    expect(organizations).toBeDefined();
    expect(typeof organizations).toBe('object');
  });

  it('deve exportar a tabela orgMembers como objeto não-nulo', () => {
    expect(orgMembers).toBeDefined();
    expect(typeof orgMembers).toBe('object');
  });

  it('deve exportar a tabela subscriptions como objeto não-nulo', () => {
    expect(subscriptions).toBeDefined();
    expect(typeof subscriptions).toBe('object');
  });

  it('deve exportar a tabela processos como objeto não-nulo', () => {
    expect(processos).toBeDefined();
    expect(typeof processos).toBe('object');
  });

  it('deve exportar a tabela movimentacoes como objeto não-nulo', () => {
    expect(movimentacoes).toBeDefined();
    expect(typeof movimentacoes).toBe('object');
  });

  it('deve exportar a tabela notificacoes como objeto não-nulo', () => {
    expect(notificacoes).toBeDefined();
    expect(typeof notificacoes).toBe('object');
  });

  it('deve exportar a tabela honorarios como objeto não-nulo', () => {
    expect(honorarios).toBeDefined();
    expect(typeof honorarios).toBe('object');
  });

  it('deve exportar a tabela pagamentos como objeto não-nulo', () => {
    expect(pagamentos).toBeDefined();
    expect(typeof pagamentos).toBe('object');
  });

  it('deve exportar a tabela notasProcesso como objeto não-nulo', () => {
    expect(notasProcesso).toBeDefined();
    expect(typeof notasProcesso).toBe('object');
  });

  it('deve exportar a tabela eventosCalendario como objeto não-nulo', () => {
    expect(eventosCalendario).toBeDefined();
    expect(typeof eventosCalendario).toBe('object');
  });
});

// ── Colunas snake_case ────────────────────────────────────────────────────────

describe('schema — nomes de colunas (snake_case no banco)', () => {
  it('tabela users deve ter colunas originais + novas colunas SaaS', () => {
    const cols = Object.keys(users);
    expect(cols).toContain('id');
    expect(cols).toContain('email');
    expect(cols).toContain('passwordHash');
    expect(cols).toContain('name');
    expect(cols).toContain('createdAt');
    // Novas colunas SaaS
    expect(cols).toContain('cpf');
    expect(cols).toContain('oabNumero');
    expect(cols).toContain('oabEstado');
    expect(cols).toContain('totpSecret');
  });

  it('tabela searches deve ter colunas corretas + orgId', () => {
    const cols = Object.keys(searches);
    expect(cols).toContain('id');
    expect(cols).toContain('userId');
    expect(cols).toContain('orgId');
    expect(cols).toContain('filters');
    expect(cols).toContain('status');
    expect(cols).toContain('processedTribunals');
    expect(cols).toContain('failedTribunals');
    expect(cols).toContain('totalTribunals');
    expect(cols).toContain('totalResults');
    expect(cols).toContain('cacheKey');
  });

  it('tabela djeSearches deve ter orgId', () => {
    const cols = Object.keys(djeSearches);
    expect(cols).toContain('orgId');
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

  it('tabela organizations deve ter colunas corretas', () => {
    const cols = Object.keys(organizations);
    expect(cols).toContain('id');
    expect(cols).toContain('name');
    expect(cols).toContain('slug');
    expect(cols).toContain('createdAt');
  });

  it('tabela orgMembers deve ter colunas corretas', () => {
    const cols = Object.keys(orgMembers);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('userId');
    expect(cols).toContain('role');
  });

  it('tabela subscriptions deve ter colunas corretas', () => {
    const cols = Object.keys(subscriptions);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('stripeCustomerId');
    expect(cols).toContain('stripeSubscriptionId');
    expect(cols).toContain('status');
    expect(cols).toContain('plan');
    expect(cols).toContain('trialEndsAt');
    expect(cols).toContain('currentPeriodEnd');
    expect(cols).toContain('stripeEventId');
  });

  it('tabela processos deve ter colunas corretas', () => {
    const cols = Object.keys(processos);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('numeroCnj');
    expect(cols).toContain('tribunal');
    expect(cols).toContain('areaDireito');
    expect(cols).toContain('status');
    expect(cols).toContain('responsavelId');
    expect(cols).toContain('ultimaMovimentacao');
    expect(cols).toContain('ultimaSyncAt');
    expect(cols).toContain('fonteSync');
    expect(cols).toContain('arquivadoAt');
    expect(cols).toContain('createdAt');
  });

  it('tabela movimentacoes deve ter colunas corretas', () => {
    const cols = Object.keys(movimentacoes);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('processoId');
    expect(cols).toContain('data');
    expect(cols).toContain('descricao');
    expect(cols).toContain('tipo');
    expect(cols).toContain('fonte');
    expect(cols).toContain('externoId');
  });

  it('tabela notificacoes deve ter colunas corretas', () => {
    const cols = Object.keys(notificacoes);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('userId');
    expect(cols).toContain('processoId');
    expect(cols).toContain('tipo');
    expect(cols).toContain('titulo');
    expect(cols).toContain('corpo');
    expect(cols).toContain('lida');
    expect(cols).toContain('lidaAt');
    expect(cols).toContain('createdAt');
  });

  it('tabela honorarios deve ter colunas corretas', () => {
    const cols = Object.keys(honorarios);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('processoId');
    expect(cols).toContain('tipo');
    expect(cols).toContain('valor');
    expect(cols).toContain('dataPrevista');
    expect(cols).toContain('statusPagamento');
  });

  it('tabela pagamentos deve ter colunas corretas', () => {
    const cols = Object.keys(pagamentos);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('honorarioId');
    expect(cols).toContain('valor');
    expect(cols).toContain('pagoEm');
    expect(cols).toContain('observacao');
  });

  it('tabela notasProcesso deve ter colunas corretas', () => {
    const cols = Object.keys(notasProcesso);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('processoId');
    expect(cols).toContain('userId');
    expect(cols).toContain('conteudo');
    expect(cols).toContain('createdAt');
  });

  it('tabela eventosCalendario deve ter colunas corretas', () => {
    const cols = Object.keys(eventosCalendario);
    expect(cols).toContain('id');
    expect(cols).toContain('orgId');
    expect(cols).toContain('processoId');
    expect(cols).toContain('tipo');
    expect(cols).toContain('titulo');
    expect(cols).toContain('data');
    expect(cols).toContain('alertadoT5');
    expect(cols).toContain('alertadoT2');
    expect(cols).toContain('alertadoT1');
  });
});

// ── SearchFilters serialization ───────────────────────────────────────────────

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

// ── Constraints de FK ─────────────────────────────────────────────────────────

describe('schema — constraints de FK (via getTableConfig)', () => {
  it('tabela searches deve ter FK para users', () => {
    const config = getTableConfig(searches);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    const fk = config.foreignKeys[0];
    const ref = fk.reference();
    expect(ref).toBeDefined();
    expect(ref.foreignTable).toBe(users);
  });

  it('tabela searches deve ter FK para organizations (orgId nullable)', () => {
    const config = getTableConfig(searches);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(2);
    const orgFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === organizations;
    });
    expect(orgFk).toBeDefined();
  });

  it('tabela searchResults deve ter FK para searches com ON DELETE CASCADE', () => {
    const config = getTableConfig(searchResults);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    const fk = config.foreignKeys[0];
    expect(fk.onDelete).toBe('cascade');
    const ref = fk.reference();
    expect(ref).toBeDefined();
    expect(ref.foreignTable).toBe(searches);
  });

  it('tabela searchCache deve ter FK para searches', () => {
    const config = getTableConfig(searchCache);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(1);
    const fk = config.foreignKeys[0];
    const ref = fk.reference();
    expect(ref).toBeDefined();
    expect(ref.foreignTable).toBe(searches);
  });

  it('tabela orgMembers deve ter FK para organizations com ON DELETE CASCADE', () => {
    const config = getTableConfig(orgMembers);
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(2);
    const orgFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === organizations;
    });
    expect(orgFk).toBeDefined();
    expect(orgFk!.onDelete).toBe('cascade');
  });

  it('tabela orgMembers deve ter FK para users com ON DELETE CASCADE', () => {
    const config = getTableConfig(orgMembers);
    const userFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === users;
    });
    expect(userFk).toBeDefined();
    expect(userFk!.onDelete).toBe('cascade');
  });

  it('tabela processos deve ter FK para organizations com ON DELETE CASCADE', () => {
    const config = getTableConfig(processos);
    const orgFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === organizations;
    });
    expect(orgFk).toBeDefined();
    expect(orgFk!.onDelete).toBe('cascade');
  });

  it('tabela movimentacoes deve ter FK para processos com ON DELETE CASCADE', () => {
    const config = getTableConfig(movimentacoes);
    const procFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === processos;
    });
    expect(procFk).toBeDefined();
    expect(procFk!.onDelete).toBe('cascade');
  });

  it('tabela pagamentos deve ter FK para honorarios com ON DELETE CASCADE', () => {
    const config = getTableConfig(pagamentos);
    const honFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === honorarios;
    });
    expect(honFk).toBeDefined();
    expect(honFk!.onDelete).toBe('cascade');
  });

  it('tabela eventosCalendario deve ter FK para processos com ON DELETE CASCADE', () => {
    const config = getTableConfig(eventosCalendario);
    const procFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === processos;
    });
    expect(procFk).toBeDefined();
    expect(procFk!.onDelete).toBe('cascade');
  });

  it('tabela notasProcesso deve ter FK para processos com ON DELETE CASCADE', () => {
    const config = getTableConfig(notasProcesso);
    const procFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === processos;
    });
    expect(procFk).toBeDefined();
    expect(procFk!.onDelete).toBe('cascade');
  });

  it('tabela djeSearches deve ter FK para organizations (orgId nullable)', () => {
    const config = getTableConfig(djeSearches);
    const orgFk = config.foreignKeys.find((fk) => {
      const ref = fk.reference();
      return ref.foreignTable === organizations;
    });
    expect(orgFk).toBeDefined();
  });
});

// ── Unique constraints ────────────────────────────────────────────────────────

describe('schema — unique constraints', () => {
  it('tabela orgMembers deve ter constraint UNIQUE em (org_id, user_id)', () => {
    const config = getTableConfig(orgMembers);
    const uniqueConstraints = config.uniqueConstraints;
    expect(uniqueConstraints.length).toBeGreaterThanOrEqual(1);
    const hasOrgUserUnique = uniqueConstraints.some(
      (uc) => uc.name === 'org_members_org_id_user_id_unique',
    );
    expect(hasOrgUserUnique).toBe(true);
  });

  it('tabela movimentacoes deve ter constraint UNIQUE em (processo_id, externo_id)', () => {
    const config = getTableConfig(movimentacoes);
    const uniqueConstraints = config.uniqueConstraints;
    expect(uniqueConstraints.length).toBeGreaterThanOrEqual(1);
    const hasUnique = uniqueConstraints.some(
      (uc) => uc.name === 'movimentacoes_processo_id_externo_id_unique',
    );
    expect(hasUnique).toBe(true);
  });

  it('tabela organizations deve ter coluna slug com UNIQUE', () => {
    // Drizzle registra unique de coluna simples como isUnique no column, não em uniqueConstraints
    const slugCol = (organizations as any).slug;
    expect(slugCol.isUnique).toBe(true);
  });

  it('tabela subscriptions deve ter coluna org_id com UNIQUE', () => {
    const orgIdCol = (subscriptions as any).orgId;
    expect(orgIdCol.isUnique).toBe(true);
  });
});

// ── Índices obrigatórios ──────────────────────────────────────────────────────

describe('schema — índices obrigatórios', () => {
  it('tabela searches deve ter índice composto em (user_id, created_at)', () => {
    const config = getTableConfig(searches);
    const idxNames = config.indexes.map((idx) => idx.config.name);
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

  it('tabela processos deve ter índice composto em (org_id, status)', () => {
    const config = getTableConfig(processos);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('processos_org_id_status_idx');
  });

  it('tabela movimentacoes deve ter índice em (processo_id, data)', () => {
    const config = getTableConfig(movimentacoes);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('movimentacoes_processo_id_data_idx');
  });

  it('tabela movimentacoes deve ter índice em (org_id, data)', () => {
    const config = getTableConfig(movimentacoes);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('movimentacoes_org_id_data_idx');
  });

  it('tabela notificacoes deve ter índice em (user_id, lida, created_at)', () => {
    const config = getTableConfig(notificacoes);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('notificacoes_user_id_lida_created_at_idx');
  });

  it('tabela eventosCalendario deve ter índice em (org_id, data)', () => {
    const config = getTableConfig(eventosCalendario);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('eventos_calendario_org_id_data_idx');
  });

  it('tabela honorarios deve ter índice em (org_id, status_pagamento)', () => {
    const config = getTableConfig(honorarios);
    const idxNames = config.indexes.map((idx) => idx.config.name);
    expect(idxNames).toContain('honorarios_org_id_status_pagamento_idx');
  });
});

// ── Documentação de testes de integração (sem banco real) ─────────────────────
//
// Os testes abaixo descrevem constraints que só podem ser validadas com banco real.
// Eles são documentados aqui para referência e devem ser executados em ambiente
// de integração (CI com Neon ou banco local).
//
// [Unitário] Inserir em organizations com name vazio retorna erro NOT NULL
// [Unitário] Inserir em org_members com mesmo (org_id, user_id) duas vezes retorna erro UNIQUE
// [Unitário] Inserir em movimentacoes com mesmo (processo_id, externo_id) duas vezes retorna erro UNIQUE
// [Unitário] Deletar organizations com org_members vinculados faz cascade delete
// [Unitário] Inserir processos sem org_id retorna erro NOT NULL
// [Integração] Migration aplicada em banco limpo cria todas as 10 novas tabelas
// [Integração] Migration de backfill cria exatamente 1 organização por usuário sem org
// [Integração] Após backfill, todos os usuários existentes têm org_id não nulo em org_members
// [Integração] Índice (org_id, status) em processos existe após migration (pg_indexes)
