import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/admin/setup
 *
 * Concede systemRole='admin' ao usuário autenticado.
 * Requer o header X-Admin-Secret com o valor de ADMIN_SETUP_SECRET.
 *
 * Uso único para bootstrapping do primeiro administrador.
 * Desabilite ou remova após o primeiro uso em produção.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  const envSecret = process.env.ADMIN_SETUP_SECRET;

  if (!envSecret) {
    return NextResponse.json(
      { error: 'ADMIN_SETUP_SECRET não configurado no ambiente.' },
      { status: 503 },
    );
  }

  if (!secret || secret !== envSecret) {
    return NextResponse.json({ error: 'Secret inválido.' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  await db
    .update(users)
    .set({ systemRole: 'admin' })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({
    ok: true,
    message: `Usuário ${session.user.email} agora é admin. Faça logout e login novamente.`,
  });
}
