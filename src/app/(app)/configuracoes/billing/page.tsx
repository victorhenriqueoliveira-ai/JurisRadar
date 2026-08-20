import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Trial',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  unpaid: 'Inadimplente',
  paused: 'Pausada',
}

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  annual: 'Anual',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date)
}

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/login')

  const result = await db
    .select({
      status: subscriptions.status,
      plan: subscriptions.plan,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      trialEndsAt: subscriptions.trialEndsAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, session.user.orgId))
    .limit(1)

  const sub = result[0]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assinatura</h1>
        <p className="text-gray-500 mt-1">Gerencie seu plano e dados de cobrança.</p>
      </div>

      {sub ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Status</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {STATUS_LABELS[sub.status] ?? sub.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Plano</span>
            <span className="text-sm text-gray-900">
              {PLAN_LABELS[sub.plan] ?? sub.plan}
            </span>
          </div>

          {sub.status === 'trialing' && sub.trialEndsAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Trial até</span>
              <span className="text-sm text-gray-900">{formatDate(sub.trialEndsAt)}</span>
            </div>
          )}

          {sub.currentPeriodEnd && sub.status !== 'trialing' && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Renovação em</span>
              <span className="text-sm text-gray-900">
                {formatDate(sub.currentPeriodEnd)}
              </span>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <a
              href="/api/billing/portal"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Gerenciar assinatura
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center space-y-4">
          <p className="text-gray-500">Nenhuma assinatura encontrada.</p>
          <a
            href="/billing"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Ver planos
          </a>
        </div>
      )}
    </div>
  )
}
