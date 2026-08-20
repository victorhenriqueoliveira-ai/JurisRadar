CREATE TABLE "dje_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_date" date NOT NULL,
	"caderno" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"publication_count" integer,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dje_editions_edition_date_caderno_unique" UNIQUE("edition_date","caderno")
);
--> statement-breakpoint
CREATE TABLE "dje_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"process_number" text NOT NULL,
	"instance" text NOT NULL,
	"court" text,
	"publication_date" date NOT NULL,
	"caderno" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dje_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text,
	"term" text NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"total_results" integer DEFAULT 0 NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dje_publications" ADD CONSTRAINT "dje_publications_edition_id_dje_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."dje_editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dje_searches" ADD CONSTRAINT "dje_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dje_pub_date_idx" ON "dje_publications" USING btree ("publication_date");--> statement-breakpoint
CREATE INDEX "dje_pub_process_number_idx" ON "dje_publications" USING btree ("process_number");--> statement-breakpoint
CREATE INDEX "dje_pub_edition_id_idx" ON "dje_publications" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "dje_searches_user_id_idx" ON "dje_searches" USING btree ("user_id","created_at");
