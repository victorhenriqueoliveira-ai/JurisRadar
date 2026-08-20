import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Variável de ambiente obrigatória para conexão com o banco Neon.
 * Deve ser uma connection string Neon com HTTP pooler habilitado.
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    '[JurisRadar] DATABASE_URL não definida. ' +
      'Configure a variável de ambiente DATABASE_URL com a connection string do Neon Postgres. ' +
      'Consulte .env.example para referência.',
  );
}

const sql = neon(databaseUrl, {
  fetchOptions: { cache: 'no-store' },
});

/**
 * Instância do cliente Drizzle ORM conectado ao Neon via HTTP pooling.
 * Compatível com Edge Runtime (Vercel Functions, Inngest steps).
 *
 * @example
 * import { db } from '@/db';
 * const result = await db.select().from(users).where(eq(users.email, email));
 */
export const db = drizzle(sql, { schema });

export type DB = typeof db;
