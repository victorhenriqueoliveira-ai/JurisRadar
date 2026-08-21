/**
 * PATCH /api/organizacoes/me
 *
 * Atualiza os dados da organização do usuário autenticado.
 * Usado no onboarding (Passo 1) para salvar nome, CNPJ e área de atuação.
 *
 * Campos aceitos:
 * - name: string (obrigatório, mínimo 1 caractere)
 * - cnpj: string (opcional)
 * - areaAtuacao: string (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireOrgContext();

    const body = await req.json().catch(() => ({}));
    const { name, cnpj, areaAtuacao } = body as {
      name?: string;
      cnpj?: string;
      areaAtuacao?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'O nome do escritório é obrigatório.' },
        { status: 400 },
      );
    }

    const updateData: {
      name: string;
      cnpj?: string | null;
      areaAtuacao?: string | null;
    } = {
      name: name.trim(),
    };

    if (cnpj !== undefined) {
      updateData.cnpj = cnpj.trim() || null;
    }

    if (areaAtuacao !== undefined) {
      updateData.areaAtuacao = areaAtuacao || null;
    }

    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, ctx.orgId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.error('[PATCH /api/organizacoes/me] erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar organização' },
      { status: 500 },
    );
  }
}
