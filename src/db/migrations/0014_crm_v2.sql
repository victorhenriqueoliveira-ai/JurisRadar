-- Task 16: Schema v2 — tabelas clientes, comunicacoes_cliente, view v_eventos_calendario e colunas em eventos

-- ── Tabela clientes ────────────────────────────────────────────────────────────
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text,
	"whatsapp" text,
	"cpf_cnpj" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_clientes_org_id" ON "clientes" USING btree ("org_id");
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_org_id_cpf_cnpj_unique" UNIQUE ("org_id", "cpf_cnpj");

-- ── Tabela comunicacoes_cliente ───────────────────────────────────────────────
--> statement-breakpoint
CREATE TABLE "comunicacoes_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"processo_id" uuid,
	"canal" text NOT NULL,
	"mensagem" text NOT NULL,
	"enviado_por" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comunicacoes_cliente" ADD CONSTRAINT "comunicacoes_cliente_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comunicacoes_cliente" ADD CONSTRAINT "comunicacoes_cliente_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comunicacoes_cliente" ADD CONSTRAINT "comunicacoes_cliente_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comunicacoes_cliente" ADD CONSTRAINT "comunicacoes_cliente_enviado_por_users_id_fk" FOREIGN KEY ("enviado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_comunicacoes_processo_id" ON "comunicacoes_cliente" USING btree ("processo_id");
--> statement-breakpoint
CREATE INDEX "idx_comunicacoes_cliente_id" ON "comunicacoes_cliente" USING btree ("cliente_id");
--> statement-breakpoint
CREATE INDEX "idx_comunicacoes_org_id" ON "comunicacoes_cliente" USING btree ("org_id", "created_at");

-- ── Colunas adicionadas em eventos_calendario ─────────────────────────────────
--> statement-breakpoint
ALTER TABLE "eventos_calendario" ADD COLUMN "hora_inicio" text;
--> statement-breakpoint
ALTER TABLE "eventos_calendario" ADD COLUMN "hora_fim" text;
--> statement-breakpoint
ALTER TABLE "eventos_calendario" ADD COLUMN "responsavel_id" uuid;
--> statement-breakpoint
ALTER TABLE "eventos_calendario" ADD COLUMN "origem" text NOT NULL DEFAULT 'manual';
--> statement-breakpoint
ALTER TABLE "eventos_calendario" ADD CONSTRAINT "eventos_calendario_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

-- ── Coluna adicionada em eventos_agenda ───────────────────────────────────────
--> statement-breakpoint
ALTER TABLE "eventos_agenda" ADD COLUMN "responsavel_id" uuid;
--> statement-breakpoint
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

-- ── View v_eventos_calendario ─────────────────────────────────────────────────
--> statement-breakpoint
CREATE OR REPLACE VIEW "v_eventos_calendario" AS
SELECT
  ec.id,
  ec.org_id,
  ec.processo_id,
  ec.tipo,
  ec.titulo,
  ec.data,
  ec.hora_inicio,
  ec.hora_fim,
  ec.responsavel_id,
  ec.origem,
  'calendario'::text AS fonte
FROM eventos_calendario ec
UNION ALL
SELECT
  ea.id,
  ea.org_id,
  NULL::uuid AS processo_id,
  ea.tipo,
  ea.titulo,
  ea.data,
  ea.hora_inicio,
  ea.hora_fim,
  ea.responsavel_id,
  'manual'::text AS origem,
  'agenda'::text AS fonte
FROM eventos_agenda ea;
