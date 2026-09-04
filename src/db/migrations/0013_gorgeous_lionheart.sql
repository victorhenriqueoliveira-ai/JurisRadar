CREATE TABLE "busca_ia_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"api_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "busca_ia_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"sources" jsonb,
	"params" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "djen_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"api_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "djen_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"items" jsonb,
	"total" integer,
	"total_bruto" integer,
	"params" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "asaas_customer_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "asaas_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "asaas_event_id" text;--> statement-breakpoint
ALTER TABLE "busca_ia_conversations" ADD CONSTRAINT "busca_ia_conversations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "busca_ia_conversations" ADD CONSTRAINT "busca_ia_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "busca_ia_messages" ADD CONSTRAINT "busca_ia_messages_conversation_id_busca_ia_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."busca_ia_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "djen_conversations" ADD CONSTRAINT "djen_conversations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "djen_conversations" ADD CONSTRAINT "djen_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "djen_messages" ADD CONSTRAINT "djen_messages_conversation_id_djen_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."djen_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_busca_ia_conversations_org_user" ON "busca_ia_conversations" USING btree ("org_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_busca_ia_messages_conversation" ON "busca_ia_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_djen_conversations_org_user" ON "djen_conversations" USING btree ("org_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_djen_messages_conversation" ON "djen_messages" USING btree ("conversation_id","created_at");