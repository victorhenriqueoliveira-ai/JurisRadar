import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/admin-guard';
import { db } from '@/db';
import { organizations, subscriptions, orgMembers, users, processos } from '@/db/schema';
import { eq, count, desc, ilike } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const baseQuery = db
    .select({
      org: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
        onboardingCompletedAt: organizations.onboardingCompletedAt,
      },
      sub: {
        status: subscriptions.status,
        plan: subscriptions.plan,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        stripeCustomerId: subscriptions.stripeCustomerId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      },
      membros: count(orgMembers.id),
    })
    .from(organizations)
    .leftJoin(subscriptions, eq(subscriptions.orgId, organizations.id))
    .leftJoin(orgMembers, eq(orgMembers.orgId, organizations.id))
    .groupBy(
      organizations.id,
      subscriptions.status,
      subscriptions.plan,
      subscriptions.trialEndsAt,
      subscriptions.currentPeriodEnd,
      subscriptions.stripeCustomerId,
      subscriptions.stripeSubscriptionId,
    )
    .orderBy(desc(organizations.createdAt))
    .limit(perPage)
    .offset(offset);

  const rows = q
    ? await db
        .select({
          org: {
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            createdAt: organizations.createdAt,
            onboardingCompletedAt: organizations.onboardingCompletedAt,
          },
          sub: {
            status: subscriptions.status,
            plan: subscriptions.plan,
            trialEndsAt: subscriptions.trialEndsAt,
            currentPeriodEnd: subscriptions.currentPeriodEnd,
            stripeCustomerId: subscriptions.stripeCustomerId,
            stripeSubscriptionId: subscriptions.stripeSubscriptionId,
          },
          membros: count(orgMembers.id),
        })
        .from(organizations)
        .leftJoin(subscriptions, eq(subscriptions.orgId, organizations.id))
        .leftJoin(orgMembers, eq(orgMembers.orgId, organizations.id))
        .where(ilike(organizations.name, `%${q}%`))
        .groupBy(
          organizations.id,
          subscriptions.status,
          subscriptions.plan,
          subscriptions.trialEndsAt,
          subscriptions.currentPeriodEnd,
          subscriptions.stripeCustomerId,
          subscriptions.stripeSubscriptionId,
        )
        .orderBy(desc(organizations.createdAt))
        .limit(perPage)
        .offset(offset)
    : await baseQuery;

  const [{ total }] = await db
    .select({ total: count() })
    .from(organizations)
    .where(q ? ilike(organizations.name, `%${q}%`) : sql`1=1`);

  return NextResponse.json({
    clientes: rows,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });
}
