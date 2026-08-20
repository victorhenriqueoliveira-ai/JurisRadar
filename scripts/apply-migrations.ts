import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const m1 = fs.readFileSync(path.resolve('src/db/migrations/0001_dje_tables.sql'), 'utf-8');
  const m2 = fs.readFileSync(path.resolve('src/db/migrations/0002_dje_search_vector.sql'), 'utf-8');

  const statements = [...m1.split('--> statement-breakpoint'), ...m2.split('--> statement-breakpoint')]
    .map(s => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    console.log('Running:', stmt.slice(0, 70).replace(/\n/g, ' ') + '...');
    // neon HTTP client: call as function(text, params) for raw SQL
    await sql.query(stmt, []);
  }

  console.log('\nTabelas criadas:');
  const tables = await sql.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`, []);
  tables.forEach((r: { tablename: string }) => console.log(' -', r.tablename));
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
