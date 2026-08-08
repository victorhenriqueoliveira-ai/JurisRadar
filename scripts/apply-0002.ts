import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const statements = [
    `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'portuguese'
  ) THEN
    RAISE EXCEPTION 'Dicionário full-text "portuguese" não disponível no banco.';
  END IF;
END $$`,
    `ALTER TABLE dje_publications
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED`,
    `CREATE INDEX dje_pub_search_vector_idx ON dje_publications USING GIN(search_vector)`,
  ];

  for (const stmt of statements) {
    console.log('Running:', stmt.slice(0, 60).replace(/\n/g, ' ') + '...');
    await sql.query(stmt, []);
  }

  console.log('Concluído.');
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
