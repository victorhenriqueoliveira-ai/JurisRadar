import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const editions = await sql.query(`SELECT edition_date, caderno, status, publication_count, error_message FROM dje_editions ORDER BY edition_date`, []);
  console.log('Editions:', editions);
  const count = await sql.query(`SELECT COUNT(*) as total FROM dje_publications`, []);
  console.log('Publications:', count[0]);
}

main().catch(console.error);
