/**
 * PATCH /api/perfil/backup
 *
 * Define se o usuário autenticado é o contato de backup do escritório.
 *
 * Regra de negócio: apenas 1 membro por escritório pode ser backup.
 * Quando isBackup = true, reseta todos os outros membros da organização
 * antes de setar o membro atual como backup (operação em transação).
 *
 * Body: { isBackup: boolean }
 * Resposta: 200 { success: true } | 400 | 401 | 500
 */

import { and, eq, ne } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { orgMembers } from '@/db/schema';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

const bodySchema = z.object({
  isBackup: z.boolean(),
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

  const { isBackup } = parsed.data;

  try {
    if (isBackup) {
      // Transação: resetar outros membros e setar o atual como backup
      await db.transaction(async (tx) => {
        // Remover backup de todos os outros membros da organização
        await tx
          .update(orgMembers)
          .set({ isBackupContato: false })
          .where(
            and(
              eq(orgMembers.orgId, ctx.orgId),
              ne(orgMembers.userId, ctx.userId),
            ),
          );

        // Setar o membro atual como backup
        await tx
          .update(orgMembers)
          .set({ isBackupContato: true })
          .where(
            and(
              eq(orgMembers.orgId, ctx.orgId),
              eq(orgMembers.userId, ctx.userId),
            ),
          );
      });
    } else {
      // Simplesmente remover o backup do membro atual
      await db
        .update(orgMembers)
        .set({ isBackupContato: false })
        .where(
          and(
            eq(orgMembers.orgId, ctx.orgId),
            eq(orgMembers.userId, ctx.userId),
          ),
        );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/perfil/backup] Erro ao atualizar is_backup_contato:', err);
    return NextResponse.json({ error: 'Erro interno ao salvar configuração de backup.' }, { status: 500 });
  }
}
