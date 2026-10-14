-- Lista de Distribuição TJSP (processos novos/eproc) — ver src/db/schema.ts
CREATE TABLE IF NOT EXISTS "distribuicao_tjsp_edicoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_distribuicao" date NOT NULL,
	"codigo_arquivo" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"process_count" integer,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "distribuicao_tjsp_edicoes_data_distribuicao_unique" UNIQUE("data_distribuicao")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribuicao_tjsp_processos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edicao_id" uuid NOT NULL,
	"numero_processo" text NOT NULL,
	"comarca" text,
	"vara" text,
	"classe" text NOT NULL,
	"data_distribuicao" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "distribuicao_tjsp_processos_numero_processo_unique" UNIQUE("numero_processo")
);
--> statement-breakpoint
ALTER TABLE "distribuicao_tjsp_processos" ADD CONSTRAINT "distribuicao_tjsp_processos_edicao_id_distribuicao_tjsp_edicoes_id_fk" FOREIGN KEY ("edicao_id") REFERENCES "public"."distribuicao_tjsp_edicoes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distrib_tjsp_data_idx" ON "distribuicao_tjsp_processos" USING btree ("data_distribuicao");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distrib_tjsp_comarca_idx" ON "distribuicao_tjsp_processos" USING btree ("comarca");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distrib_tjsp_classe_idx" ON "distribuicao_tjsp_processos" USING btree ("classe");
