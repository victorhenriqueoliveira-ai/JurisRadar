CREATE TABLE "eventos_calendario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"data" date NOT NULL,
	"alertado_t5" boolean DEFAULT false NOT NULL,
	"alertado_t2" boolean DEFAULT false NOT NULL,
	"alertado_t1" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "honorarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"processo_id" uuid,
	"tipo" text NOT NULL,
	"valor" numeric(12, 2),
	"data_prevista" date,
	"status_pagamento" text DEFAULT 'pendente' NOT NULL,
	CONSTRAINT "honorarios_processo_id_unique" UNIQUE("processo_id")
);
--> statement-breakpoint
CREATE TABLE "movimentacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"data" timestamp NOT NULL,
	"descricao" text NOT NULL,
	"tipo" text,
	"fonte" text,
	"externo_id" text,
	CONSTRAINT "movimentacoes_processo_id_externo_id_unique" UNIQUE("processo_id","externo_id")
);
--> statement-breakpoint
CREATE TABLE "notas_processo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"user_id" uuid,
	"conteudo" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"processo_id" uuid,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"corpo" text,
	"lida" boolean DEFAULT false NOT NULL,
	"lida_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'associado' NOT NULL,
	CONSTRAINT "org_members_org_id_user_id_unique" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"honorario_id" uuid NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"pago_em" date NOT NULL,
	"observacao" text
);
--> statement-breakpoint
CREATE TABLE "processos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"numero_cnj" text NOT NULL,
	"tribunal" text,
	"area_direito" text,
	"status" text DEFAULT 'ativo' NOT NULL,
	"responsavel_id" uuid,
	"ultima_movimentacao" text,
	"ultima_sync_at" timestamp,
	"fonte_sync" text[],
	"arquivado_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"status" text NOT NULL,
	"plan" text NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_end" timestamp,
	"stripe_event_id" text,
	CONSTRAINT "subscriptions_org_id_unique" UNIQUE("org_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "subscriptions_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cpf" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oab_numero" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oab_estado" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_secret" text;--> statement-breakpoint
ALTER TABLE "dje_searches" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "eventos_calendario" ADD CONSTRAINT "eventos_calendario_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_calendario" ADD CONSTRAINT "eventos_calendario_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "honorarios" ADD CONSTRAINT "honorarios_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "honorarios" ADD CONSTRAINT "honorarios_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas_processo" ADD CONSTRAINT "notas_processo_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas_processo" ADD CONSTRAINT "notas_processo_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas_processo" ADD CONSTRAINT "notas_processo_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_honorario_id_honorarios_id_fk" FOREIGN KEY ("honorario_id") REFERENCES "public"."honorarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processos" ADD CONSTRAINT "processos_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processos" ADD CONSTRAINT "processos_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eventos_calendario_org_id_data_idx" ON "eventos_calendario" USING btree ("org_id","data");--> statement-breakpoint
CREATE INDEX "honorarios_org_id_status_pagamento_idx" ON "honorarios" USING btree ("org_id","status_pagamento");--> statement-breakpoint
CREATE INDEX "movimentacoes_processo_id_data_idx" ON "movimentacoes" USING btree ("processo_id","data");--> statement-breakpoint
CREATE INDEX "movimentacoes_org_id_data_idx" ON "movimentacoes" USING btree ("org_id","data");--> statement-breakpoint
CREATE INDEX "notificacoes_user_id_lida_created_at_idx" ON "notificacoes" USING btree ("user_id","lida","created_at");--> statement-breakpoint
CREATE INDEX "processos_org_id_status_idx" ON "processos" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "processos_org_id_responsavel_idx" ON "processos" USING btree ("org_id","responsavel_id");--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dje_searches" ADD CONSTRAINT "dje_searches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;