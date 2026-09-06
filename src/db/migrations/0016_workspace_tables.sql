CREATE TABLE "tarefas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "titulo" text NOT NULL,
  "processo_ref" text,
  "prioridade" text DEFAULT 'media' NOT NULL,
  "prazo" date,
  "status" text DEFAULT 'pendente' NOT NULL,
  "criado_por_id" uuid REFERENCES "users"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "kanban_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "titulo" text NOT NULL,
  "coluna" text DEFAULT 'a_fazer' NOT NULL,
  "prioridade" text DEFAULT 'media' NOT NULL,
  "tag" text,
  "prazo" text,
  "responsavel_id" uuid REFERENCES "users"("id"),
  "ordem" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "consultorias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "titulo" text NOT NULL,
  "cliente_id" uuid REFERENCES "clientes"("id") ON DELETE SET NULL,
  "valor_estimado" numeric(12,2),
  "data" date,
  "status" text DEFAULT 'pendente' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "casos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "titulo" text NOT NULL,
  "cliente_id" uuid REFERENCES "clientes"("id") ON DELETE SET NULL,
  "responsavel_id" uuid REFERENCES "users"("id"),
  "status" text DEFAULT 'ativo' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
