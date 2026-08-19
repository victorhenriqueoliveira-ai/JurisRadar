import { NextResponse } from 'next/server'
import { db } from '@/db'
import { subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context'

export async function GET() {
  try {
    const ctx = await requireOrgContext()

    const result = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.orgId, ctx.orgId))
      .limit(1)

    const stripeCustomerId = result[0]?.stripeCustomerId
    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'Sem assinatura ativa' }, { status: 400 })
    }

    const returnUrl =
      `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/configuracoes/billing`

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    })

    return NextResponse.redirect(session.url)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    throw err
  }
}
