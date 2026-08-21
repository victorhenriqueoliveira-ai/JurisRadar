'use client'

interface TrialBannerProps {
  trialEndsAt: Date | null
  status: string
}

function daysUntil(date: Date): number {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function TrialBanner({ trialEndsAt, status }: TrialBannerProps) {
  if (status !== 'trialing') return null
  if (!trialEndsAt) return null

  const days = daysUntil(trialEndsAt)
  if (days > 4) return null

  const label =
    days <= 0
      ? 'Seu trial expirou'
      : days === 1
        ? 'Seu trial expira amanhã'
        : `Seu trial expira em ${days} dias`

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-yellow-800 font-medium">{label}</span>
      <a
        href="/billing"
        className="ml-4 inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-yellow-600 text-white hover:bg-yellow-700"
      >
        Assinar agora
      </a>
    </div>
  )
}
