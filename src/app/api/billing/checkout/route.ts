import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = session.user.orgId
  if (!orgId) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const plan = searchParams.get('plan') ?? 'monthly'

  const planPrice =
    plan === 'annual'
      ? process.env.STRIPE_PRICE_ANNUAL!
      : process.env.STRIPE_PRICE_MONTHLY!

  const origin = req.headers.get('origin') ?? `https://${req.headers.get('host')}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkoutSession = await (stripe.checkout.sessions as any).create({
    mode: 'subscription',
    subscription_data: { trial_period_days: 14 },
    customer_creation: 'always',
    line_items: [{ price: planPrice, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/billing`,
    metadata: { orgId },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
