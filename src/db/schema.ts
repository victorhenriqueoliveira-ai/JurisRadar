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
  smallint,
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
  // Contato para notificação multi-canal (CRM jurídico)
  whatsappNumero: text('whatsapp_numero'),
  smsNumero: text('sms_numero'),
  // Token de redefinição de senha
  passwordResetToken: text('password_reset_token'),
  passwordResetExpiresAt: timestamp('password_reset_expires_at'),
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
    // Contato de backup para escalação de garantia de intimação
    isBackupContato: boolean('is_backup_contato').notNull().default(false),
  },
  (t) => ({
    uniqueOrgUser: unique('org_members_org_id_user_id_unique').on(t.orgId, t.userId),
  }),
);

/** Assinaturas por organização */
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
  // Asaas billing
  asaasCustomerId: text('asaas_customer_id'),
  asaasSubscriptionId: text('asaas_subscription_id'),
  asaasEventId: text('asaas_event_id'),
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
    // Vínculo com state machine de garantia de intimação (CRM jurídico)
    garantiaId: uuid('garantia_id'),
    confirmadoEm: timestamp('confirmado_em', { withTimezone: true }),
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
    // Vínculo com Asaas para parcelamento recorrente
    asaasSubscriptionId: text('asaas_subscription_id'),
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
    // v2: campos adicionados pela task_16
    horaInicio: text('hora_inicio'),
    horaFim: text('hora_fim'),
    responsavelId: uuid('responsavel_id').references(() => users.id),
    origem: text('origem').notNull().default('manual'),
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
    // v2: campo adicionado pela task_16
    responsavelId: uuid('responsavel_id').references(() => users.id),
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

// ── Tabelas CRM Jurídico ──────────────────────────────────────────────────────

/**
 * State machine de garantia de intimação.
 * Rastreia o protocolo de escalação multi-canal para intimações críticas.
 * step: email_enviado | sms_whatsapp_enviado | backup_notificado | confirmado
 */
export const notificacaoGarantia = pgTable(
  'notificacao_garantia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificacaoId: uuid('notificacao_id')
      .notNull()
      .references(() => notificacoes.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    responsavelId: uuid('responsavel_id')
      .notNull()
      .references(() => users.id),
    backupId: uuid('backup_id').references(() => users.id),
    step: text('step').notNull().default('email_enviado'),
    confirmadoEm: timestamp('confirmado_em', { withTimezone: true }),
    emailEnviadoEm: timestamp('email_enviado_em', { withTimezone: true }).defaultNow().notNull(),
    smsEnviadoEm: timestamp('sms_enviado_em', { withTimezone: true }),
    whatsappEnviadoEm: timestamp('whatsapp_enviado_em', { withTimezone: true }),
    backupNotificadoEm: timestamp('backup_notificado_em', { withTimezone: true }),
    inngestCorrelationId: text('inngest_correlation_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('idx_notificacao_garantia_org').on(t.orgId),
    // Índice parcial para cron de fallback — apenas registros não confirmados
    stepEmailEnviadoEmIdx: index('idx_notificacao_garantia_step').on(t.step, t.emailEnviadoEm),
  }),
);

/**
 * Sub-contas Asaas por escritório.
 * Cada escritório tem uma sub-conta Asaas para cobranças diretas de seus clientes.
 * api_key_encrypted: AES-256-GCM com chave em ASAAS_ENCRYPTION_KEY.
 * status: pending | active | suspended
 */
export const asaasAccounts = pgTable('asaas_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .unique()
    .references(() => organizations.id),
  asaasAccountId: text('asaas_account_id').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  status: text('status').notNull().default('pending'),
  onboardingUrl: text('onboarding_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
});

/**
 * Cobranças geradas via Asaas.
 * Representa boletos, Pix e parcelas de assinaturas recorrentes.
 * status: pending | received | overdue | refunded | cancelled
 * tipo: unica | recorrente
 */
export const cobrancas = pgTable(
  'cobrancas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    honorarioId: uuid('honorario_id')
      .notNull()
      .references(() => honorarios.id),
    asaasPaymentId: text('asaas_payment_id').unique(),
    asaasSubscriptionId: text('asaas_subscription_id'),
    tipo: text('tipo').notNull(),
    valor: numeric('valor', { precision: 12, scale: 2 }).notNull(),
    vencimento: date('vencimento'),
    status: text('status').notNull().default('pending'),
    linkBoleto: text('link_boleto'),
    linkPix: text('link_pix'),
    qrCodePix: text('qr_code_pix'),
    clienteEmail: text('cliente_email').notNull(),
    clienteNome: text('cliente_nome').notNull(),
    clienteCpfCnpj: text('cliente_cpf_cnpj').notNull(),
    parcelaNumero: smallint('parcela_numero'),
    parcelaTotal: smallint('parcela_total'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgStatusIdx: index('idx_cobrancas_org_status').on(t.orgId, t.status),
    honorarioIdx: index('idx_cobrancas_honorario').on(t.honorarioId),
    asaasEventIdx: index('idx_cobrancas_asaas_event').on(t.asaasPaymentId),
  }),
);

// ── Tabelas IA Chat ───────────────────────────────────────────────────────────

/** Conversas do assistente DJEN IA por usuário/org */
export const djenConversations = pgTable(
  'djen_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    // Histórico no formato Anthropic MessageParam[] para multi-turn
    apiMessages: jsonb('api_messages').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgUserIdx: index('idx_djen_conversations_org_user').on(t.orgId, t.userId, t.updatedAt),
  }),
);

/** Mensagens individuais de cada conversa DJEN IA */
export const djenMessages = pgTable(
  'djen_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => djenConversations.id, { onDelete: 'cascade' }),
    role: text('role').$type<'user' | 'assistant'>().notNull(),
    text: text('text').notNull(),
    items: jsonb('items'),
    total: integer('total'),
    totalBruto: integer('total_bruto'),
    params: jsonb('params'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    conversationIdx: index('idx_djen_messages_conversation').on(t.conversationId, t.createdAt),
  }),
);

/** Conversas da Busca IA Unificada (DJEN + DataJud + DJe) */
export const buscaIaConversations = pgTable(
  'busca_ia_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    apiMessages: jsonb('api_messages').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgUserIdx: index('idx_busca_ia_conversations_org_user').on(t.orgId, t.userId, t.updatedAt),
  }),
);

/** Mensagens individuais da Busca IA Unificada */
export const buscaIaMessages = pgTable(
  'busca_ia_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => buscaIaConversations.id, { onDelete: 'cascade' }),
    role: text('role').$type<'user' | 'assistant'>().notNull(),
    text: text('text').notNull(),
    sources: jsonb('sources'),
    params: jsonb('params'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    conversationIdx: index('idx_busca_ia_messages_conversation').on(t.conversationId, t.createdAt),
  }),
);

// ── CRM v2 — Comunicação com cliente ─────────────────────────────────────────

/**
 * Clientes dos escritórios (partes representadas).
 * Unique constraint por (org_id, cpf_cnpj) garante upsert sem duplicatas.
 */
export const clientes = pgTable(
  'clientes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    email: text('email'),
    whatsapp: text('whatsapp'),
    cpfCnpj: text('cpf_cnpj'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdIdx: index('idx_clientes_org_id').on(t.orgId),
    uniqueOrgCpfCnpj: unique('clientes_org_id_cpf_cnpj_unique').on(t.orgId, t.cpfCnpj),
  }),
);

/**
 * Histórico de comunicações enviadas ao cliente via WhatsApp ou e-mail.
 * canal: 'whatsapp' | 'email'
 */
export const comunicacoesCliente = pgTable(
  'comunicacoes_cliente',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),
    processoId: uuid('processo_id').references(() => processos.id, { onDelete: 'set null' }),
    canal: text('canal').notNull(),
    mensagem: text('mensagem').notNull(),
    enviadoPor: uuid('enviado_por')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    processoIdIdx: index('idx_comunicacoes_processo_id').on(t.processoId),
    clienteIdIdx: index('idx_comunicacoes_cliente_id').on(t.clienteId),
    orgIdIdx: index('idx_comunicacoes_org_id').on(t.orgId, t.createdAt),
  }),
);

/**
 * Anexos de processos — referências a arquivos no Vercel Blob.
 * Limite por arquivo: 10 MB. Quota por escritório: 500 MB.
 */
export const anexos = pgTable(
  'anexos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    processoId: uuid('processo_id')
      .notNull()
      .references(() => processos.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    url: text('url').notNull(),
    tamanho: integer('tamanho').notNull(),
    mimeType: text('mime_type').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    processoIdx: index('idx_anexos_processo').on(t.processoId),
  }),
);
