/**
 * GET /api/organizacoes/me/membros
 * Lista todos os membros do escritório do usuário autenticado.
 * Resposta: [{ id, userId, nome, email, papel, entradaEm }]
 *
 * POST /api/organizacoes/me/membros
 * Convida membro por e-mail com papel pré-definido. Apenas sócios.
 * Body: { email, papel: 'associado' | 'estagiario' }
 * Cria registro em org_members com status pendente e envia e-mail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orgMembers, users, organizations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireOrgContext, requireRole } from '@/lib/org-context';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { sendEmail } from '@/lib/email/send';
import { ConviteMembro } from '@/lib/email/templates/ConviteMembro';
import React from 'react';
import { randomUUID } from 'crypto';

const VALID_ROLES = ['associado', 'estagiario'] as const;
type InviteRole = (typeof VALID_ROLES)[number];

export async function GET() {
  try {
    const ctx = await requireOrgContext();

    const members = await db
      .select({
        id: orgMembers.id,
        userId: orgMembers.userId,
        papel: orgMembers.role,
        nome: users.name,
        email: users.email,
        entradaEm: users.createdAt,
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, ctx.orgId));

    return NextResponse.json(members);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[GET /api/organizacoes/me/membros] erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgContext();
    requireRole(ctx, 'socio');

    const body = await req.json().catch(() => ({}));
    const { email, papel } = body as { email?: string; papel?: string };

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    if (!papel || !VALID_ROLES.includes(papel as InviteRole)) {
      return NextResponse.json(
        { error: 'Papel inválido. Use "associado" ou "estagiario".' },
        { status: 400 },
      );
    }

    const emailNorm = email.trim().toLowerCase();

    // Check if user already exists
    const existingUsers = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, emailNorm));

    let targetUserId: string;
    let targetUserName: string | null;

    if (existingUsers.length > 0) {
      targetUserId = existingUsers[0].id;
      targetUserName = existingUsers[0].name;

      // Check if already member
      const existingMember = await db
        .select({ id: orgMembers.id })
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, ctx.orgId), eq(orgMembers.userId, targetUserId)));

      if (existingMember.length > 0) {
        return NextResponse.json(
          { error: 'Este usuário já é membro do escritório.' },
          { status: 409 },
        );
      }
    } else {
      // Create a placeholder user for pending invite
      targetUserId = randomUUID();
      targetUserName = null;

      await db.insert(users).values({
        id: targetUserId,
        email: emailNorm,
        passwordHash: '',
        name: null,
      });
    }

    await db.insert(orgMembers).values({
      orgId: ctx.orgId,
      userId: targetUserId,
      role: papel as InviteRole,
    });

    // Get org name and inviter name for email
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ctx.orgId));

    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, ctx.userId));

    const token = randomUUID();
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/convite?token=${token}`;

    // Fire-and-forget email — do not await in production to avoid blocking
    sendEmail({
      to: emailNorm,
      subject: `Convite para o escritório ${org?.name ?? 'JurisRadar'}`,
      react: React.createElement(ConviteMembro, {
        escritorioNome: org?.name ?? 'JurisRadar',
        papel,
        inviteUrl,
        convidadoPor: inviter?.name ?? 'Um sócio',
      }),
    }).catch((err) => {
      console.error('[POST /api/organizacoes/me/membros] falha ao enviar e-mail:', err);
    });

    return NextResponse.json(
      {
        ok: true,
        userId: targetUserId,
        nome: targetUserName,
        email: emailNorm,
        papel,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[POST /api/organizacoes/me/membros] erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
