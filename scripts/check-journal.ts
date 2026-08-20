import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const res = await sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);
