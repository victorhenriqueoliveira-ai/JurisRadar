/**
 * PATCH /api/onboarding/complete
 *
 * Marca o onboarding da organização como concluído,
 * gravando o timestamp atual em `organizations.onboarding_completed_at`.
 *
 * Requer autenticação e organização configurada.
 * Idempotente: chamadas repetidas atualizam o timestamp sem erro.
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

export async function PATCH() {
  try {
    const ctx = await requireOrgContext();

    await db
      .update(organizations)
      .set({ onboardingCompletedAt: new Date() })
      .where(eq(organizations.id, ctx.orgId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.error('[PATCH /api/onboarding/complete] erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao concluir onboarding' },
      { status: 500 },
    );
  }
}
