/**
 * POST /api/processos/sync
 *
 * Endpoint de disparo manual de sincronização de processos.
 * Dispara o evento Inngest `processos/sync.requested` para o usuário autenticado
 * de forma assíncrona (sem timeout no request HTTP).
 *
 * Requer autenticação e organização configurada.
 * Retorna 202 Accepted imediatamente — o processamento ocorre em background.
 */

import { NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const ctx = await requireOrgContext();

    // Busca OAB do usuário para incluir no evento
    const userRecord = await db
      .select({ oabNumero: users.oabNumero, oabEstado: users.oabEstado })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    const oabNumero = userRecord[0]?.oabNumero ?? null;
    const oabEstado = userRecord[0]?.oabEstado ?? null;

    // Dispara o evento Inngest de forma assíncrona
    await inngest.send({
      name: 'processos/sync.requested',
      data: {
        userId: ctx.userId,
        orgId: ctx.orgId,
        oabNumero,
        oabEstado,
      },
    });

    return NextResponse.json(
      { status: 'sync_triggered', message: 'Sincronização iniciada em background' },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.error('[POST /api/processos/sync] erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao disparar sincronização' },
      { status: 500 },
    );
  }
}
