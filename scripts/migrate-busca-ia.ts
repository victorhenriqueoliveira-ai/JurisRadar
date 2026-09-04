import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "busca_ia_conversations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "title" text NOT NULL,
      "api_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `;
  console.log('✓ busca_ia_conversations');

  await sql`
    CREATE TABLE IF NOT EXISTS "busca_ia_messages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "conversation_id" uuid NOT NULL REFERENCES "busca_ia_conversations"("id") ON DELETE cascade,
      "role" text NOT NULL,
      "text" text NOT NULL,
      "sources" jsonb,
      "params" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `;
  console.log('✓ busca_ia_messages');

  await sql`CREATE INDEX IF NOT EXISTS "idx_busca_ia_conversations_org_user" ON "busca_ia_conversations" USING btree ("org_id","user_id","updated_at")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_busca_ia_messages_conversation" ON "busca_ia_messages" USING btree ("conversation_id","created_at")`;
  console.log('✓ Indexes criados');
  console.log('Migration concluída.');
}

main().catch((err) => { console.error(err); process.exit(1); });
