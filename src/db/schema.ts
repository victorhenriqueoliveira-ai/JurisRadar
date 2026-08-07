import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  date,
  index,
  unique,
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

// ── Tabelas DJE/TJSP ─────────────────────────────────────────────────────────

/** Edições do DJE/TJSP — controla o status de indexação por data e caderno */
export const djeEditions = pgTable(
  'dje_editions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionDate: date('edition_date').notNull(),
    caderno: integer('caderno').notNull(), // 2 ou 3
    status: text('status')
      .$type<'pending' | 'downloading' | 'parsing' | 'completed' | 'failed'>()
      .notNull()
      .default('pending'),
    publicationCount: integer('publication_count'),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqueEditionCaderno: unique().on(t.editionDate, t.caderno),
  }),
);

/** Publicações do DJE/TJSP indexadas para busca full-text */
export const djePublications = pgTable(
  'dje_publications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => djeEditions.id),
    processNumber: text('process_number').notNull(),
    instance: text('instance').$type<'1' | '2'>().notNull(),
    court: text('court'),
    publicationDate: date('publication_date').notNull(),
    caderno: integer('caderno').notNull(),
    content: text('content').notNull(),
    // search_vector: adicionado via migration SQL raw (Drizzle não suporta GENERATED nativamente)
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    publicationDateIdx: index('dje_pub_date_idx').on(t.publicationDate),
    processNumberIdx: index('dje_pub_process_number_idx').on(t.processNumber),
    editionIdIdx: index('dje_pub_edition_id_idx').on(t.editionId),
  }),
);

/** Histórico de buscas DJE realizadas por usuários */
export const djeSearches = pgTable(
  'dje_searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name'),
    term: text('term').notNull(),
    dateFrom: date('date_from').notNull(),
    dateTo: date('date_to').notNull(),
    totalResults: integer('total_results').notNull().default(0),
    executedAt: timestamp('executed_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index('dje_searches_user_id_idx').on(t.userId, t.createdAt),
  }),
);
