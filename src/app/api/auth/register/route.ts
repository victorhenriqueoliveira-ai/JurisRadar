import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/db';
import { users, organizations, orgMembers, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || 'escritorio';
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    suffix++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, name, cpf, oabNumero, oabEstado, escritorioNome } = body as {
      email?: string;
      password?: string;
      name?: string;
      cpf?: string;
      oabNumero?: string;
      oabEstado?: string;
      escritorioNome?: string;
    };

    if (!email?.trim() || !password || !name?.trim()) {
      return NextResponse.json(
        { error: 'E-mail, senha e nome são obrigatórios.' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres.' },
        { status: 400 },
      );
    }

    const emailNorm = email.trim().toLowerCase();

    // Verificar se e-mail já existe
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailNorm))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado.' },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    // Criar usuário
    const [newUser] = await db
      .insert(users)
      .values({
        email: emailNorm,
        passwordHash,
        name: name.trim(),
        cpf: cpf?.replace(/\D/g, '') || null,
        oabNumero: oabNumero?.trim() || null,
        oabEstado: oabEstado?.trim().toUpperCase() || null,
        systemRole: 'user',
      })
      .returning({ id: users.id });

    // Criar organização
    const orgName = escritorioNome?.trim() || `Escritório de ${name.trim().split(' ')[0]}`;
    const slug = await uniqueSlug(orgName);

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: orgName,
        slug,
      })
      .returning({ id: organizations.id });

    // Associar usuário como sócio
    await db.insert(orgMembers).values({
      orgId: newOrg.id,
      userId: newUser.id,
      role: 'socio',
    });

    // Criar assinatura em trial (14 dias)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    await db.insert(subscriptions).values({
      orgId: newOrg.id,
      stripeCustomerId: `pending_${newOrg.id}`,
      status: 'trialing',
      plan: 'trial',
      trialEndsAt,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json({ error: 'Erro interno ao criar conta.' }, { status: 500 });
  }
}
