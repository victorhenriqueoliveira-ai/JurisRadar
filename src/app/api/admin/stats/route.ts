import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/admin-guard';
import { db } from '@/db';
import { users, organizations, subscriptions, searches, processos } from '@/db/schema';
import { count, eq, gte, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET() {
  const guard = await requireAdmin();
  if (isNextResponse(guard)) return guard;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    [totalUsersRow],
    [totalOrgsRow],
    [activeSubsRow],
    [trialingSubsRow],
    [canceledSubsRow],
    [totalSearchesRow],
    [searchesThisMonthRow],
    [totalProcessosRow],
    [newUsersThisMonthRow],
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(organizations),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, 'active')),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, 'trialing')),
    db.select({ count: count() }).from(subscriptions).where(
      or(eq(subscriptions.status, 'canceled'), eq(subscriptions.status, 'past_due'))
    ),
    db.select({ count: count() }).from(searches),
    db.select({ count: count() }).from(searches).where(gte(searches.createdAt, thirtyDaysAgo)),
    db.select({ count: count() }).from(processos),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
  ]);

  // MRR estimado: ativos * R$157 (mensal) + calculado do plano
  // Simplificado: conta por plano
  const subsWithPlan = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'));

  let mrr = 0;
  for (const sub of subsWithPlan) {
    if (sub.plan === 'annual') mrr += 127;
    else mrr += 157;
  }

  // Buscas por dia (últimos 7 dias)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const searchesByDay = await db
    .select({
      day: sql<string>`date_trunc('day', ${searches.createdAt})::date::text`,
      total: count(),
    })
    .from(searches)
    .where(gte(searches.createdAt, sevenDaysAgo))
    .groupBy(sql`date_trunc('day', ${searches.createdAt})`)
    .orderBy(sql`date_trunc('day', ${searches.createdAt})`);

  return NextResponse.json({
    usuarios: {
      total: totalUsersRow.count,
      novosUltimos30Dias: newUsersThisMonthRow.count,
    },
    organizacoes: {
      total: totalOrgsRow.count,
      ativas: activeSubsRow.count,
      emTrial: trialingSubsRow.count,
      canceladas: canceledSubsRow.count,
    },
    faturamento: {
      mrrEstimado: mrr,
      arrEstimado: mrr * 12,
    },
    buscas: {
      total: totalSearchesRow.count,
      ultimos30Dias: searchesThisMonthRow.count,
      porDia: searchesByDay,
    },
    processos: {
      total: totalProcessosRow.count,
    },
  });
}
