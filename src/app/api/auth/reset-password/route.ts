import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { hash } from 'bcryptjs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { token?: string; novaSenha?: string };
  const { token, novaSenha } = body;

  if (!token || !novaSenha) {
    return NextResponse.json({ error: 'Token e nova senha são obrigatórios.' }, { status: 400 });
  }

  if (novaSenha.length < 8) {
    return NextResponse.json({ error: 'A senha deve ter ao menos 8 caracteres.' }, { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(users.passwordResetToken, token),
        gte(users.passwordResetExpiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: 'Link inválido ou expirado. Solicite um novo link.' },
      { status: 400 },
    );
  }

  const passwordHash = await hash(novaSenha, 12);

  await db
    .update(users)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
