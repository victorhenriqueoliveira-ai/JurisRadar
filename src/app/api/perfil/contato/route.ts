/**
 * PATCH /api/perfil/contato
 *
 * Atualiza o campo `whatsapp_numero` do usuário autenticado.
 * Valida o número no formato E.164 brasileiro antes de persistir.
 *
 * Body: { whatsapp_numero: string }
 * Resposta: 200 { success: true } | 400 | 401 | 500
 */

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { isNumeroE164Valido } from '@/lib/zenvia/phone';

const bodySchema = z.object({
  whatsapp_numero: z
    .string()
    .min(1, 'O número de WhatsApp é obrigatório.')
    .refine(isNumeroE164Valido, {
      message:
        'Número de WhatsApp inválido. Use o formato E.164 brasileiro: +55DDNNNNNNNNN (ex: +5511999999999).',
    }),
});

export async function PATCH(req: NextRequest) {
  // 1. Autenticação
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }

  // 2. Validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido — JSON malformado.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Dados inválidos.',
        detalhes: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // 3. Atualizar banco
  try {
    await db
      .update(users)
      .set({ whatsappNumero: parsed.data.whatsapp_numero })
      .where(eq(users.id, ctx.userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/perfil/contato] Erro ao atualizar whatsapp_numero:', err);
    return NextResponse.json({ error: 'Erro interno ao salvar contato.' }, { status: 500 });
  }
}
