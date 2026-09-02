import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

/**
 * POST /api/admin/usuarios/[userId]/senha
 *
 * Redefine a senha de qualquer usuário. Requer systemRole='admin'.
 * Body: { novaSenha: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const { userId } = params;
  const body = await req.json().catch(() => ({})) as { novaSenha?: string };
  const novaSenha = body.novaSenha?.trim();

  if (!novaSenha || novaSenha.length < 8) {
    return NextResponse.json(
      { error: 'A nova senha deve ter ao menos 8 caracteres.' },
      { status: 400 },
    );
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const passwordHash = await hash(novaSenha, 12);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));

  return NextResponse.json({ ok: true, email: user.email });
}
