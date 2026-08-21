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
  boolean,
  numeric,
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

/** Preferências de notificação por usuário */
export interface NotificationPrefs {
  /** Tipos de notificação com e-mail desativado */
  emailDesativado?: string[];
}

// ── Tabelas ───────────────────────────────────────────────────────────────────

/** Tabela de usuários do sistema */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // Colunas adicionadas para SaaS multi-tenant
  cpf: text('cpf'),
  oabNumero: text('oab_numero'),
  oabEstado: text('oab_estado'),
  totpSecret: text('totp_secret'),
  // Preferências de notificação (task_11)
  notificationPrefs: jsonb('notification_prefs').$type<NotificationPrefs>(),
  // Papel na plataforma (admin = dono do produto, user = cliente advogado)
  systemRole: text('system_role').$type<'admin' | 'user'>().notNull().default('user'),
  // Token para aceitar convite de membro
  inviteToken: text('invite_token'),
  inviteTokenExpiresAt: timestamp('invite_token_expires_at'),
});

// ── Tabelas SaaS multi-tenant ─────────────────────────────────────────────────

/** Organizações (escritórios de advocacia) */
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  cnpj: text('cnpj'),
  areaAtuacao: text('area_atuacao'),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Membros de cada organização */
export const orgMembers = pgTable(
  'org_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role')
      .$type<'socio' | 'associado' | 'estagiario'>()
      .notNull()
      .default('associado'),
  },
  (t) => ({
    uniqueOrgUser: unique('org_members_org_id_user_id_unique').on(t.orgId, t.userId),
  }),
);

/** Assinaturas Stripe por organização */
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  status: text('status').notNull(),
  plan: text('plan').notNull(),
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodEnd: timestamp('current_period_end'),
  stripeEventId: text('stripe_event_id').unique(),
});

/** Processos judiciais monitorados por organização */
export const processos = pgTable(
  'processos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    numeroCnj: text('numero_cnj').notNull(),
    tribunal: text('tribunal'),
    areaDireito: text('area_direito'),
    status: text('status').notNull().default('ativo'),
    responsavelId: uuid('responsavel_id').references(() => users.id),
    ultimaMovimentacao: text('ultima_movimentacao'),
    ultimaSyncAt: timestamp('ultima_sync_at'),
    fonteSync: text('fonte_sync').array(),
    arquivadoAt: timestamp('arquivado_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    orgIdStatusIdx: index('processos_org_id_status_idx').on(t.orgId, t.status),
    orgIdResponsavelIdx: index('processos_org_id_responsavel_idx').on(
      t.orgId,
      t.responsavelId,
    ),
  }),
);

/** Movimentações dos processos */
export const movimentacoes = pgTable(
  'movimentacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    processoId: uuid('processo_id')
      .notNull()
      .references(() => processos.id, { onDelete: 'cascade' }),
    data: timestamp('data').notNull(),
    descricao: text('descricao').notNull(),
    tipo: text('tipo'),
    fonte: text('fonte'),
    externoId: text('externo_id'),
  },
  (t) => ({
    uniqueProcessoExterno: unique('movimentacoes_processo_id_externo_id_unique').on(
      t.processoId,
      t.externoId,
    ),
    processoIdDataIdx: index('movimentacoes_processo_id_data_idx').on(
      t.processoId,
      t.data,
    ),
    orgIdDataIdx: index('movimentacoes_org_id_data_idx').on(t.orgId, t.data),
  }),
);

/** Notificações para usuários */
export const notificacoes = pgTable(
  'notificacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    processoId: uuid('processo_id').references(() => processos.id),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    corpo: text('corpo'),
    lida: boolean('lida').notNull().default(false),
    lidaAt: timestamp('lida_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // Referência à movimentação que originou a notificação (task_11)
    movimentacaoId: uuid('movimentacao_id').references(() => movimentacoes.id),
  },
  (t) => ({
    userIdLidaCreatedAtIdx: index('notificacoes_user_id_lida_created_at_idx').on(
      t.userId,
      t.lida,
      t.createdAt,
    ),
    movimentacaoIdIdx: index('notificacoes_movimentacao_id_idx').on(t.movimentacaoId),
  }),
);

/** Honorários vinculados a processos */
export const honorarios = pgTable(
  'honorarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    processoId: uuid('processo_id')
      .unique()
      .references(() => processos.id),
    tipo: text('tipo').notNull(),
    valor: numeric('valor', { precision: 12, scale: 2 }),
    dataPrevista: date('data_prevista'),
    statusPagamento: text('status_pagamento').notNull().default('pendente'),
  },
  (t) => ({
    orgIdStatusPagamentoIdx: index('honorarios_org_id_status_pagamento_idx').on(
      t.orgId,
      t.statusPagamento,
    ),
  }),
);

/** Pagamentos de honorários */
export const pagamentos = pgTable('pagamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  honorarioId: uuid('honorario_id')
    .notNull()
    .references(() => honorarios.id, { onDelete: 'cascade' }),
  valor: numeric('valor', { precision: 12, scale: 2 }).notNull(),
  pagoEm: date('pago_em').notNull(),
  observacao: text('observacao'),
});

/** Notas internas de processos */
export const notasProcesso = pgTable('notas_processo', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  processoId: uuid('processo_id')
    .notNull()
    .references(() => processos.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  conteudo: text('conteudo').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Eventos de calendário vinculados a processos */
export const eventosCalendario = pgTable(
  'eventos_calendario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    processoId: uuid('processo_id')
      .notNull()
      .references(() => processos.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    data: date('data').notNull(),
    alertadoT5: boolean('alertado_t5').notNull().default(false),
    alertadoT2: boolean('alertado_t2').notNull().default(false),
    alertadoT1: boolean('alertado_t1').notNull().default(false),
  },
  (t) => ({
    orgIdDataIdx: index('eventos_calendario_org_id_data_idx').on(t.orgId, t.data),
  }),
);

/** Eventos de agenda pessoal — não vinculados a processos */
export const eventosAgenda = pgTable(
  'eventos_agenda',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    descricao: text('descricao'),
    data: date('data').notNull(),
    horaInicio: text('hora_inicio'),
    horaFim: text('hora_fim'),
    tipo: text('tipo').notNull().default('pessoal'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    orgIdDataIdx: index('eventos_agenda_org_id_data_idx').on(t.orgId, t.data),
  }),
);

// ── Tabelas de busca (com org_id adicionado para multi-tenant) ────────────────

/** Tabela de buscas federadas */
export const searches = pgTable(
  'searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    orgId: uuid('org_id').references(() => organizations.id),
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
    orgId: uuid('org_id').references(() => organizations.id),
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
