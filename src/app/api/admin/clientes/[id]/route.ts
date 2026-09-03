import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/admin-guard';
import { db } from '@/db';
import {
  organizations, subscriptions, orgMembers, users, processos, searches,
  djeSearches, asaasAccounts, cobrancas, anexos, notificacaoGarantia,
} from '@/db/schema';
import { eq, count, inArray } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const { id } = params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  if (!org) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, id))
    .limit(1);

  const membrosRows = await db
    .select({
      id: orgMembers.id,
      role: orgMembers.role,
      userId: users.id,
      name: users.name,
      email: users.email,
      oabNumero: users.oabNumero,
      oabEstado: users.oabEstado,
      createdAt: users.createdAt,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, id));

  const [{ total: totalProcessos }] = await db
    .select({ total: count() })
    .from(processos)
    .where(eq(processos.orgId, id));

  const [{ total: totalBuscas }] = await db
    .select({ total: count() })
    .from(searches)
    .where(eq(searches.orgId, id));

  return NextResponse.json({
    org,
    sub: sub ?? null,
    membros: membrosRows,
    stats: {
      totalProcessos,
      totalBuscas,
    },
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/admin/clientes/[id]]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  const { action, trialEndsAt, plan, status } = body as {
    action?: string;
    trialEndsAt?: string;
    plan?: string;
    status?: string;
  };

  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Assinatura não encontrada.' }, { status: 404 });
  }

  if (action === 'extend_trial' && trialEndsAt) {
    await db
      .update(subscriptions)
      .set({ trialEndsAt: new Date(trialEndsAt), status: 'trialing' })
      .where(eq(subscriptions.orgId, id));
    return NextResponse.json({ ok: true });
  }

  if (action === 'set_plan' && plan && status) {
    await db
      .update(subscriptions)
      .set({ plan, status })
      .where(eq(subscriptions.orgId, id));
    return NextResponse.json({ ok: true });
  }

  if (action === 'cancel') {
    await db
      .update(subscriptions)
      .set({ status: 'canceled' })
      .where(eq(subscriptions.orgId, id));
    return NextResponse.json({ ok: true });
  }

  if (action === 'activate') {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await db
      .update(subscriptions)
      .set({ status: 'active', currentPeriodEnd: periodEnd })
      .where(eq(subscriptions.orgId, id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await requireAdmin();
    if (isNextResponse(guard)) return guard;

    const { id } = params;

    const [org] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
    }

    // Coleta userIds dos membros antes de qualquer exclusão
    const membros = await db
      .select({ userId: orgMembers.userId })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, id));

    const userIds = membros.map((m) => m.userId);

    // Tabelas com FK ON DELETE NO ACTION — precisam ser limpas manualmente
    await db.delete(notificacaoGarantia).where(eq(notificacaoGarantia.orgId, id));
    await db.delete(cobrancas).where(eq(cobrancas.orgId, id));
    await db.delete(anexos).where(eq(anexos.orgId, id));
    await db.delete(asaasAccounts).where(eq(asaasAccounts.orgId, id));
    await db.delete(djeSearches).where(eq(djeSearches.orgId, id));
    await db.delete(searches).where(eq(searches.orgId, id));

    // Apaga a organização — cascade remove o resto (subscriptions, orgMembers,
    // processos, movimentacoes, eventosCalendario, etc.)
    await db.delete(organizations).where(eq(organizations.id, id));

    // Remove usuários que eram exclusivos desta organização
    if (userIds.length > 0) {
      const aindaMembros = await db
        .select({ userId: orgMembers.userId })
        .from(orgMembers)
        .where(inArray(orgMembers.userId, userIds));

      const idsAindaMembros = new Set(aindaMembros.map((m) => m.userId));
      const idsParaApagar = userIds.filter((uid) => !idsAindaMembros.has(uid));

      if (idsParaApagar.length > 0) {
        await db.delete(users).where(inArray(users.id, idsParaApagar));
      }
    }

    return NextResponse.json({ ok: true, deleted: org.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DELETE /api/admin/clientes/[id]]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
