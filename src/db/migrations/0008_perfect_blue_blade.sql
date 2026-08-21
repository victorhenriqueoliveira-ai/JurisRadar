CREATE TABLE "eventos_agenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"data" date NOT NULL,
	"hora_inicio" text,
	"hora_fim" text,
	"tipo" text DEFAULT 'pessoal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notificacoes" ADD COLUMN "movimentacao_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "cnpj" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "area_atuacao" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_prefs" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "system_role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eventos_agenda_org_id_data_idx" ON "eventos_agenda" USING btree ("org_id","data");--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_movimentacao_id_movimentacoes_id_fk" FOREIGN KEY ("movimentacao_id") REFERENCES "public"."movimentacoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificacoes_movimentacao_id_idx" ON "notificacoes" USING btree ("movimentacao_id");