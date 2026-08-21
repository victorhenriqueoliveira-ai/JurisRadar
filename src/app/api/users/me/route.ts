import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      cpf: users.cpf,
      oabNumero: users.oabNumero,
      oabEstado: users.oabEstado,
      notificationPrefs: users.notificationPrefs,
      systemRole: users.systemRole,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, cpf, oabNumero, oabEstado, notificationPrefs, senhaAtual, novaSenha } = body as {
    name?: string;
    cpf?: string;
    oabNumero?: string;
    oabEstado?: string;
    notificationPrefs?: unknown;
    senhaAtual?: string;
    novaSenha?: string;
  };

  const updates: Partial<typeof users.$inferInsert> = {};

  if (name !== undefined) updates.name = name.trim() || null;
  if (cpf !== undefined) updates.cpf = cpf.replace(/\D/g, '') || null;
  if (oabNumero !== undefined) updates.oabNumero = oabNumero.trim() || null;
  if (oabEstado !== undefined) updates.oabEstado = oabEstado.trim().toUpperCase() || null;
  if (notificationPrefs !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates.notificationPrefs = notificationPrefs as any;
  }

  // Troca de senha
  if (novaSenha) {
    if (!senhaAtual) {
      return NextResponse.json({ error: 'Senha atual é obrigatória para trocar a senha.' }, { status: 400 });
    }
    if (novaSenha.length < 8) {
      return NextResponse.json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    const [currentUser] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const senhaValida = await compare(senhaAtual, currentUser.passwordHash);
    if (!senhaValida) {
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 });
    }

    updates.passwordHash = await hash(novaSenha, 12);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
  }

  await db.update(users).set(updates).where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
