import { db } from '@/db'
import { subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface AsaasPayment {
  id: string
  subscription?: string
  externalReference?: string
  status: string
  value: number
}

interface AsaasSubscription {
  id: string
  externalReference?: string
  status: string
}

interface AsaasWebhookPayload {
  event: string
  payment?: AsaasPayment
  subscription?: AsaasSubscription
}

async function updateStatus(orgId: string, status: string, eventId: string) {
  await db
    .update(subscriptions)
    .set({ status, asaasEventId: eventId })
    .where(eq(subscriptions.orgId, orgId))
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('asaas-access-token')
  if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as AsaasWebhookPayload
  const { event } = body

  const orgId = body.payment?.externalReference ?? body.subscription?.externalReference
  const eventId = body.payment?.id ?? body.subscription?.id ?? ''

  if (!orgId || !eventId) {
    return NextResponse.json({ received: true, skipped: 'no orgId or eventId' })
  }

  // Idempotency: skip if this event was already processed
  const [already] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.asaasEventId, eventId))
    .limit(1)

  if (already) {
    return NextResponse.json({ received: true, idempotent: true })
  }

  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      await updateStatus(orgId, 'active', eventId)
      break
    case 'PAYMENT_OVERDUE':
      await updateStatus(orgId, 'past_due', eventId)
      break
    case 'SUBSCRIPTION_DELETED':
      await updateStatus(orgId, 'canceled', eventId)
      break
    default:
      // Unhandled events — acknowledge receipt
      break
  }

  return NextResponse.json({ received: true })
}
