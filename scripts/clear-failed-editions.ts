import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const res = await sql.query(`DELETE FROM dje_editions WHERE status IN ('failed', 'pending', 'downloading', 'parsing') RETURNING edition_date, caderno, status`, []);
  console.log(`Removidos ${res.length} registros:`, res);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
