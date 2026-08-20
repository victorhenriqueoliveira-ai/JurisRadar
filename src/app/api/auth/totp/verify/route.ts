/**
 * POST /api/auth/totp/verify
 *
 * Verifica um código TOTP de 6 dígitos para o usuário autenticado.
 * Usado para confirmar que o setup do 2FA foi bem-sucedido.
 *
 * Body: { code: string }
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyTotp } from '@/lib/auth/totp';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const code = body?.code as string | undefined;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json(
        { error: 'Código inválido. Informe o código de 6 dígitos do seu app autenticador.' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Busca o secret atual do usuário
    const result = await db
      .select({ totpSecret: users.totpSecret })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = result[0];

    if (!user?.totpSecret) {
      return NextResponse.json(
        { error: '2FA não configurado. Configure primeiro via /api/auth/totp/setup.' },
        { status: 400 }
      );
    }

    // Verifica o código TOTP
    const valido = verifyTotp(user.totpSecret, code);

    if (!valido) {
      return NextResponse.json(
        { error: 'Código inválido ou expirado. Tente novamente.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, message: '2FA verificado com sucesso.' });
  } catch (error) {
    console.error('[TOTP Verify] Erro ao verificar código:', error instanceof Error ? error.message : 'Erro desconhecido');
    return NextResponse.json({ error: 'Erro interno ao verificar código 2FA' }, { status: 500 });
  }
}
