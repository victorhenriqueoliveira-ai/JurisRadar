'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BillingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null)

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setLoading(plan)
    try {
      const res = await fetch(`/api/billing/checkout?plan=${plan}`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao criar sessão de pagamento')
      const { url } = await res.json()
      if (url) router.push(url)
    } catch (err) {
      console.error(err)
      setLoading(null)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Sua assinatura expirou</h1>
        <p className="mt-2 text-muted-foreground">
          Escolha um plano para continuar usando o JurisRadar.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          onClick={() => handleCheckout('monthly')}
          disabled={loading !== null}
          className="rounded-lg border border-primary bg-primary px-8 py-4 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading === 'monthly' ? 'Aguarde...' : 'Assinar Mensal — R$157/mês'}
        </button>

        <button
          onClick={() => handleCheckout('annual')}
          disabled={loading !== null}
          className="rounded-lg border border-primary bg-background px-8 py-4 font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
        >
          {loading === 'annual' ? 'Aguarde...' : 'Assinar Anual — R$127/mês (R$1.524/ano)'}
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        7 dias grátis. Cancele a qualquer momento.
      </p>
    </main>
  )
}
