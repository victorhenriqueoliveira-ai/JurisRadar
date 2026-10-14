-- Conversas do assistente de IA da busca "Processos Novos" — ver src/db/schema.ts
CREATE TABLE IF NOT EXISTS "distribuicao_tjsp_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"api_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribuicao_tjsp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"processos" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "distribuicao_tjsp_conversations" ADD CONSTRAINT "distribuicao_tjsp_conversations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribuicao_tjsp_conversations" ADD CONSTRAINT "distribuicao_tjsp_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribuicao_tjsp_messages" ADD CONSTRAINT "distribuicao_tjsp_messages_conversation_id_distribuicao_tjsp_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."distribuicao_tjsp_conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distrib_tjsp_conversations_org_user" ON "distribuicao_tjsp_conversations" USING btree ("org_id","user_id","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distrib_tjsp_messages_conversation" ON "distribuicao_tjsp_messages" USING btree ("conversation_id","created_at");
