/**
 * Script de seed para criação de usuários iniciais do JurisRadar.
 *
 * Uso: pnpm db:seed
 *
 * Variáveis de ambiente usadas (opcional — usa padrões se não definidas):
 *   SEED_USER_EMAIL    — e-mail do usuário administrador (padrão: admin@jurisradar.com.br)
 *   SEED_USER_PASSWORD — senha do usuário administrador (padrão: JurisRadar@2026)
 *   SEED_USER_NAME     — nome do usuário administrador (padrão: Administrador)
 */

import { hash } from 'bcryptjs';
import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;

interface SeedUser {
  email: string;
  password: string;
  name: string;
}

const seedUsers: SeedUser[] = [
  {
    email: process.env.SEED_USER_EMAIL ?? 'admin@jurisradar.com.br',
    password: process.env.SEED_USER_PASSWORD ?? 'JurisRadar@2026',
    name: process.env.SEED_USER_NAME ?? 'Administrador',
  },
];

async function seed() {
  console.log('🌱 Iniciando seed de usuários...\n');

  for (const userData of seedUsers) {
    // Verifica se o usuário já existe
    const existing = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existing.length > 0) {
      // Garante que usuário seed existente tenha role admin
      await db.update(users).set({ systemRole: 'admin' }).where(eq(users.email, userData.email));
      console.log(`⚠️  Usuário ${userData.email} já existe — role atualizado para admin.`);
      continue;
    }

    // Cria hash da senha com bcrypt
    const passwordHash = await hash(userData.password, SALT_ROUNDS);

    await db.insert(users).values({
      email: userData.email,
      passwordHash,
      name: userData.name,
      systemRole: 'admin',
    });

    console.log(`✅ Usuário criado: ${userData.email} (${userData.name})`);
  }

  console.log('\n✓ Seed concluído.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro durante o seed:', err);
  process.exit(1);
});
