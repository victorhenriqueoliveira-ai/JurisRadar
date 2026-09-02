import { auth } from '@/auth'
import { db } from '@/db'
import { users, organizations, subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ASAAS_BASE_URL =
  process.env.ASAAS_BASE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://www.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3')

const PLANS = {
  monthly: { value: 157, cycle: 'MONTHLY', label: 'Mensal' },
  annual: { value: 1524, cycle: 'YEARLY', label: 'Anual' },
} as const

function asaasHeaders(): Record<string, string> {
  const key = process.env.ASAAS_API_KEY
  if (!key) throw new Error('ASAAS_API_KEY não configurada')
  return { 'Content-Type': 'application/json', access_token: key }
}

async function asaasPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method: 'POST',
    headers: asaasHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(`Asaas ${path} falhou`), { status: res.status, body: err })
  }
  return res.json() as T
}

async function asaasGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, { headers: asaasHeaders() })
  if (!res.ok) throw new Error(`Asaas GET ${path} falhou: ${res.status}`)
  return res.json() as T
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = session.user.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const plan = (searchParams.get('plan') ?? 'monthly') as 'monthly' | 'annual'
  const planConfig = PLANS[plan] ?? PLANS.monthly

  try {
    const [org] = await db
      .select({ name: organizations.name, cnpj: organizations.cnpj })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    const [user] = await db
      .select({ email: users.email, name: users.name, cpf: users.cpf })
      .from(users)
      .where(eq(users.id, session.user.id!))
      .limit(1)

    // Reuse existing Asaas customer if available
    const [existingSub] = await db
      .select({ asaasCustomerId: subscriptions.asaasCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.orgId, orgId))
      .limit(1)

    let asaasCustomerId = existingSub?.asaasCustomerId ?? null

    if (!asaasCustomerId) {
      const customerPayload: Record<string, unknown> = {
        name: org?.name ?? user?.name ?? 'Escritório',
        email: user?.email ?? '',
        externalReference: orgId,
      }
      const cpfCnpj = org?.cnpj ?? user?.cpf
      if (cpfCnpj) customerPayload.cpfCnpj = cpfCnpj

      const customer = await asaasPost<{ id: string }>('/customers', customerPayload)
      asaasCustomerId = customer.id
    }

    // Due date: tomorrow (trial already consumed, first payment is immediate-ish)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextDueDate = tomorrow.toISOString().slice(0, 10)

    const sub = await asaasPost<{ id: string }>('/subscriptions', {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED',
      value: planConfig.value,
      nextDueDate,
      cycle: planConfig.cycle,
      description: `JurisRadar — Plano ${planConfig.label}`,
      externalReference: orgId,
    })

    // Get first payment to obtain the invoiceUrl
    const payments = await asaasGet<{ data?: Array<{ id: string; invoiceUrl?: string; bankSlipUrl?: string }> }>(
      `/subscriptions/${sub.id}/payments?limit=1`,
    )
    const firstPayment = payments.data?.[0]
    const paymentUrl = firstPayment?.invoiceUrl ?? firstPayment?.bankSlipUrl ?? null

    // Persist Asaas IDs on the subscription record
    await db
      .update(subscriptions)
      .set({ asaasCustomerId, asaasSubscriptionId: sub.id, plan })
      .where(eq(subscriptions.orgId, orgId))

    const origin = req.headers.get('origin') ?? `https://${req.headers.get('host')}`

    return NextResponse.json({
      url: paymentUrl ?? `${origin}/dashboard?checkout=pending`,
    })
  } catch (err) {
    console.error('[billing/checkout]', err)
    return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 })
  }
}
