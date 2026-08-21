import { db } from '@/db'
import { subscriptions } from '@/db/schema'
import { stripe } from '@/lib/stripe'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session

  const orgId = session.metadata?.orgId
  if (!orgId) return

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? ''

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null

  // Upsert subscription record
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: 'trialing',
        stripeEventId: event.id,
      })
      .where(eq(subscriptions.orgId, orgId))
  } else {
    await db.insert(subscriptions).values({
      orgId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: 'trialing',
      plan: 'monthly',
      stripeEventId: event.id,
    })
  }
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = event.data.object as any

  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null

  if (!subscriptionId) return

  await db
    .update(subscriptions)
    .set({ status: 'active', stripeEventId: event.id })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = event.data.object as any

  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null

  if (!subscriptionId) return

  await db
    .update(subscriptions)
    .set({ status: 'past_due', stripeEventId: event.id })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  await db
    .update(subscriptions)
    .set({ status: 'canceled', stripeEventId: event.id })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency: check if event already processed
  const alreadyProcessed = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.stripeEventId, event.id))
    .limit(1)

  if (alreadyProcessed.length > 0) {
    return NextResponse.json({ received: true, idempotent: true })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event)
      break
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event)
      break
    default:
      // Unhandled event type — return 200 to acknowledge receipt
      break
  }

  return NextResponse.json({ received: true })
}
