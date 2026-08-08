import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

let cachedId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  if (cachedId) return cachedId;

  const email = process.env.SEED_USER_EMAIL ?? 'admin@jurisradar.com.br';
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!result[0]) {
    throw new Error(`Usuário sistema não encontrado (${email}). Execute pnpm db:seed.`);
  }

  cachedId = result[0].id;
  return cachedId;
}
