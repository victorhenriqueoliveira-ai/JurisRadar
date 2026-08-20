/**
 * POST /api/auth/totp/setup
 *
 * Gera um novo secret TOTP para o usuário autenticado e retorna o QR code.
 * O secret é salvo em `users.totp_secret` mas o 2FA só estará ativo após
 * o usuário verificar o primeiro código via `/api/auth/totp/verify`.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateSecret, getQrCodeUrl } from '@/lib/auth/totp';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email ?? '';

    // Gera novo secret TOTP
    const secret = generateSecret();

    // Salva o secret no banco (ainda não ativo até verificação)
    await db
      .update(users)
      .set({ totpSecret: secret })
      .where(eq(users.id, userId));

    // Gera QR code como data URI
    const qrCodeUrl = await getQrCodeUrl(secret, userEmail);

    return NextResponse.json({
      qrCodeUrl,
      // Retorna secret para backup manual (usuário pode digitar manualmente no app)
      secret,
    });
  } catch (error) {
    console.error('[TOTP Setup] Erro ao gerar secret:', error instanceof Error ? error.message : 'Erro desconhecido');
    return NextResponse.json({ error: 'Erro interno ao configurar 2FA' }, { status: 500 });
  }
}
