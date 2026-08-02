import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  date,
  index,
} from 'drizzle-orm/pg-core';

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

export type SearchStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'failed';

export interface SearchFilters {
  nomeParte?: string;
  cpfCnpj?: string;
  numeroProcesso?: string;
  tribunais?: string[];
  dataInicio?: string;
  dataFim?: string;
  classe?: string;
  assunto?: string;
}

export interface Parte {
  polo: string;
  nome: string;
}

export interface UltimaMovimentacao {
  data: string;
  descricao: string;
}

// ── Tabelas ───────────────────────────────────────────────────────────────────

/** Tabela de usuários do sistema */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Tabela de buscas federadas */
export const searches = pgTable(
  'searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name'),
    filters: jsonb('filters').$type<SearchFilters>(),
    status: text('status')
      .$type<SearchStatus>()
      .notNull()
      .default('pending'),
    processedTribunals: text('processed_tribunals').array().default([]),
    failedTribunals: text('failed_tribunals').array().default([]),
    totalTribunals: integer('total_tribunals').notNull(),
    totalResults: integer('total_results').default(0),
    cacheKey: text('cache_key'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdCreatedAtIdx: index('searches_user_id_created_at_idx').on(
      table.userId,
      table.createdAt,
    ),
    cacheKeyIdx: index('searches_cache_key_idx').on(table.cacheKey),
  }),
);

/** Tabela de resultados individuais de processos por busca */
export const searchResults = pgTable(
  'search_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    searchId: uuid('search_id')
      .notNull()
      .references(() => searches.id, { onDelete: 'cascade' }),
    numero: text('numero').notNull(),
    tribunal: text('tribunal').notNull(),
    grau: text('grau').notNull(),
    classe: text('classe'),
    assunto: text('assunto'),
    dataDistribuicao: date('data_distribuicao'),
    orgaoJulgador: text('orgao_julgador'),
    partes: jsonb('partes').$type<Parte[]>(),
    ultimaMovimentacao: jsonb('ultima_movimentacao').$type<UltimaMovimentacao>(),
  },
  (table) => ({
    searchIdIdx: index('search_results_search_id_idx').on(table.searchId),
  }),
);

/** Tabela de cache de buscas com TTL */
export const searchCache = pgTable('search_cache', {
  cacheKey: text('cache_key').primaryKey(),
  searchId: uuid('search_id')
    .notNull()
    .references(() => searches.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
