CREATE TABLE "search_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"search_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"tribunal" text NOT NULL,
	"grau" text NOT NULL,
	"classe" text,
	"assunto" text,
	"data_distribuicao" date,
	"orgao_julgador" text,
	"partes" jsonb,
	"ultima_movimentacao" jsonb
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text,
	"filters" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"processed_tribunals" text[] DEFAULT '{}',
	"failed_tribunals" text[] DEFAULT '{}',
	"total_tribunals" integer NOT NULL,
	"total_results" integer DEFAULT 0,
	"cache_key" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "search_cache" ADD CONSTRAINT "search_cache_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_results_search_id_idx" ON "search_results" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "searches_user_id_created_at_idx" ON "searches" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "searches_cache_key_idx" ON "searches" USING btree ("cache_key");