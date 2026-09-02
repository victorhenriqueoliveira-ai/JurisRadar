import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { resend } from '@/lib/email/resend';

const TOKEN_TTL_MINUTES = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Não revelar se o e-mail existe ou não
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await db
    .update(users)
    .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
    .where(eq(users.id, user.id));

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@jurisradaroficial.com.br';

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Redefinição de senha — JurisRadar',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0f2d5e;margin-bottom:8px">JurisRadar</h2>
          <p>Olá${user.name ? ` ${user.name}` : ''},</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}"
               style="background:#0f2d5e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
              Redefinir senha
            </a>
          </p>
          <p style="color:#9ca3af;font-size:13px">
            Este link expira em ${TOKEN_TTL_MINUTES} minutos.<br>
            Se você não solicitou a redefinição, ignore este e-mail.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px">JurisRadar — Gestão jurídica inteligente</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[forgot-password] erro ao enviar e-mail:', err);
    // Não expõe o erro — apenas loga
  }

  return NextResponse.json({ ok: true });
}
