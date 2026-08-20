/**
 * PATCH /api/organizacoes/me/membros/:id
 * Altera o papel de um membro. Apenas sócios.
 * Regras:
 *   - Sócio não pode rebaixar a si mesmo
 *   - 403 para membro de outro escritório
 *
 * DELETE /api/organizacoes/me/membros/:id
 * Remove membro do escritório. Apenas sócios.
 * Regras:
 *   - Sócio único não pode se auto-remover
 *   - 403 para membro de outro escritório
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orgMembers } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { requireOrgContext, requireRole } from '@/lib/org-context';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

const VALID_ROLES = ['socio', 'associado', 'estagiario'] as const;
type MemberRole = (typeof VALID_ROLES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireOrgContext();
    requireRole(ctx, 'socio');

    const memberId = params.id;

    const [member] = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.id, memberId));

    if (!member) {
      return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
    }

    // 403 if member belongs to another org
    if (member.orgId !== ctx.orgId) {
      return NextResponse.json(
        { error: 'Acesso negado: membro de outro escritório.' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { papel } = body as { papel?: string };

    if (!papel || !VALID_ROLES.includes(papel as MemberRole)) {
      return NextResponse.json(
        { error: 'Papel inválido. Use "socio", "associado" ou "estagiario".' },
        { status: 400 },
      );
    }

    // Sócio não pode rebaixar a si mesmo
    if (member.userId === ctx.userId && papel !== 'socio') {
      return NextResponse.json(
        { error: 'Sócio não pode rebaixar a si mesmo.' },
        { status: 400 },
      );
    }

    await db
      .update(orgMembers)
      .set({ role: papel as MemberRole })
      .where(eq(orgMembers.id, memberId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[PATCH /api/organizacoes/me/membros/:id] erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireOrgContext();
    requireRole(ctx, 'socio');

    const memberId = params.id;

    const [member] = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.id, memberId));

    if (!member) {
      return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
    }

    // 403 if member belongs to another org
    if (member.orgId !== ctx.orgId) {
      return NextResponse.json(
        { error: 'Acesso negado: membro de outro escritório.' },
        { status: 403 },
      );
    }

    // Prevent sole socio from self-removing
    if (member.userId === ctx.userId && member.role === 'socio') {
      const [{ value: socioCount }] = await db
        .select({ value: count() })
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, ctx.orgId),
            eq(orgMembers.role, 'socio'),
          ),
        );

      if (Number(socioCount) <= 1) {
        return NextResponse.json(
          { error: 'Escritório deve ter ao menos um sócio.' },
          { status: 400 },
        );
      }
    }

    await db.delete(orgMembers).where(eq(orgMembers.id, memberId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[DELETE /api/organizacoes/me/membros/:id] erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
