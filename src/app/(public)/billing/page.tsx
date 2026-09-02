'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BillingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setLoading(plan)
    setErro(null)
    try {
      const res = await fetch(`/api/billing/checkout?plan=${plan}`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao gerar link de pagamento')
      const { url } = await res.json()
      if (url) router.push(url)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível gerar o link de pagamento. Tente novamente.')
      setLoading(null)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 bg-[#f4f6fb]">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#0f2d5e] flex items-center justify-center">
            <span className="text-white font-extrabold text-xs" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</span>
          </div>
          <span className="font-extrabold text-[#0f2d5e] text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Escolha seu plano</h1>
        <p className="mt-2 text-[#6b7280]">
          Seu período de avaliação encerrou. Assine para continuar usando o JurisRadar.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          onClick={() => handleCheckout('monthly')}
          disabled={loading !== null}
          className="rounded-xl border-2 border-[#0f2d5e] bg-[#0f2d5e] px-8 py-5 font-semibold text-white transition hover:bg-[#1a4a8a] disabled:opacity-50 text-left min-w-[220px]"
        >
          <div className="text-lg">{loading === 'monthly' ? 'Aguarde…' : 'Plano Mensal'}</div>
          <div className="text-sm font-normal opacity-80 mt-0.5">R$ 157 / mês</div>
        </button>

        <button
          onClick={() => handleCheckout('annual')}
          disabled={loading !== null}
          className="rounded-xl border-2 border-[#0f2d5e] bg-white px-8 py-5 font-semibold text-[#0f2d5e] transition hover:bg-[#f0f4ff] disabled:opacity-50 text-left min-w-[220px]"
        >
          <div className="text-lg">{loading === 'annual' ? 'Aguarde…' : 'Plano Anual'}</div>
          <div className="text-sm font-normal opacity-70 mt-0.5">R$ 127 / mês · R$ 1.524/ano</div>
          <div className="text-xs font-medium text-green-600 mt-1">Economize ~19%</div>
        </button>
      </div>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {erro}
        </p>
      )}

      <p className="text-sm text-[#9ca3af]">
        Pague com PIX, boleto ou cartão de crédito. Cancele quando quiser.
      </p>
    </main>
  )
}
