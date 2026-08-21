import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

/** GET /api/auth/convite?token=xxx — valida token e retorna email */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token não fornecido.' }, { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, inviteTokenExpiresAt: users.inviteTokenExpiresAt })
    .from(users)
    .where(
      and(
        eq(users.inviteToken, token),
        gt(users.inviteTokenExpiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 404 });
  }

  return NextResponse.json({ email: user.email, name: user.name });
}

/** POST /api/auth/convite — aceita convite: define nome + senha */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, name, password } = body as { token?: string; name?: string; password?: string };

    if (!token || !name?.trim() || !password) {
      return NextResponse.json({ error: 'Token, nome e senha são obrigatórios.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        and(
          eq(users.inviteToken, token),
          gt(users.inviteTokenExpiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 404 });
    }

    const passwordHash = await hash(password, 12);

    await db
      .update(users)
      .set({
        name: name.trim(),
        passwordHash,
        inviteToken: null,
        inviteTokenExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    console.error('[POST /api/auth/convite]', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
