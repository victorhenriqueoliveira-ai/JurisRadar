'use client'

import Link from 'next/link'
import type { PrazoUrgente } from '@/services/dashboard'

interface ListaPrazosUrgentesProps {
  prazos: PrazoUrgente[]
}

function diasColor(dias: number): string {
  if (dias <= 1) return 'var(--jr-danger, #ef4444)'
  if (dias <= 3) return 'var(--jr-warning, #f59e0b)'
  return 'var(--jr-success, #10b981)'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ListaPrazosUrgentes({ prazos }: ListaPrazosUrgentesProps) {
  if (prazos.length === 0) {
    return (
      <p
        className="text-sm"
        style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
        data-testid="lista-prazos-vazia"
      >
        Nenhum prazo urgente nos próximos dias.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="lista-prazos-urgentes">
      {prazos.map((prazo) => (
        <li
          key={`${prazo.processoId}-${prazo.prazoAt}`}
          className="flex items-center justify-between gap-4 rounded-lg p-3"
          style={{
            background: 'var(--jr-glass-bg, rgba(255,255,255,0.05))',
            border: '1px solid var(--jr-glass-border, rgba(255,255,255,0.1))',
          }}
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/app/crm/${prazo.processoId}`}
              className="text-sm font-medium hover:underline truncate block"
              style={{ color: 'var(--jr-primary, #6366f1)' }}
            >
              {prazo.numeroCnj}
            </Link>
            {prazo.tribunal && (
              <p
                className="text-xs truncate"
                style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
              >
                {prazo.tribunal}
              </p>
            )}
            <p className="text-xs" style={{ color: 'var(--jr-text-secondary, #9ca3af)' }}>
              {formatDate(prazo.prazoAt)}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-white"
            style={{ background: diasColor(prazo.diasRestantes) }}
          >
            {prazo.diasRestantes === 0
              ? 'Hoje'
              : prazo.diasRestantes === 1
                ? '1 dia'
                : `${prazo.diasRestantes} dias`}
          </span>
        </li>
      ))}
    </ul>
  )
}
