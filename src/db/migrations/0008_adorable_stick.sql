CREATE TABLE "anexos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"url" text NOT NULL,
	"tamanho" integer NOT NULL,
	"mime_type" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asaas_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"asaas_account_id" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"onboarding_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	CONSTRAINT "asaas_accounts_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "cobrancas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"honorario_id" uuid NOT NULL,
	"asaas_payment_id" text,
	"asaas_subscription_id" text,
	"tipo" text NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"vencimento" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"link_boleto" text,
	"link_pix" text,
	"qr_code_pix" text,
	"cliente_email" text NOT NULL,
	"cliente_nome" text NOT NULL,
	"cliente_cpf_cnpj" text NOT NULL,
	"parcela_numero" smallint,
	"parcela_total" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cobrancas_asaas_payment_id_unique" UNIQUE("asaas_payment_id")
);
--> statement-breakpoint
CREATE TABLE "notificacao_garantia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notificacao_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"responsavel_id" uuid NOT NULL,
	"backup_id" uuid,
	"step" text DEFAULT 'email_enviado' NOT NULL,
	"confirmado_em" timestamp with time zone,
	"email_enviado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"sms_enviado_em" timestamp with time zone,
	"whatsapp_enviado_em" timestamp with time zone,
	"backup_notificado_em" timestamp with time zone,
	"inngest_correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "honorarios" ADD COLUMN "asaas_subscription_id" text;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD COLUMN "garantia_id" uuid;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD COLUMN "confirmado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "org_members" ADD COLUMN "is_backup_contato" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "whatsapp_numero" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_numero" text;--> statement-breakpoint
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asaas_accounts" ADD CONSTRAINT "asaas_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_honorario_id_honorarios_id_fk" FOREIGN KEY ("honorario_id") REFERENCES "public"."honorarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacao_garantia" ADD CONSTRAINT "notificacao_garantia_notificacao_id_notificacoes_id_fk" FOREIGN KEY ("notificacao_id") REFERENCES "public"."notificacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacao_garantia" ADD CONSTRAINT "notificacao_garantia_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacao_garantia" ADD CONSTRAINT "notificacao_garantia_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacao_garantia" ADD CONSTRAINT "notificacao_garantia_backup_id_users_id_fk" FOREIGN KEY ("backup_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_anexos_processo" ON "anexos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX "idx_cobrancas_org_status" ON "cobrancas" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_cobrancas_honorario" ON "cobrancas" USING btree ("honorario_id");--> statement-breakpoint
CREATE INDEX "idx_cobrancas_asaas_event" ON "cobrancas" USING btree ("asaas_payment_id");--> statement-breakpoint
CREATE INDEX "idx_notificacao_garantia_org" ON "notificacao_garantia" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_notificacao_garantia_step" ON "notificacao_garantia" USING btree ("step","email_enviado_em");