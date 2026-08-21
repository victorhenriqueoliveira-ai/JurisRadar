'use client'

import Link from 'next/link'
import type { MovimentacaoRecente } from '@/services/dashboard'

interface TimelineMovimentacoesProps {
  movimentacoes: MovimentacaoRecente[]
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TimelineMovimentacoes({ movimentacoes }: TimelineMovimentacoesProps) {
  if (movimentacoes.length === 0) {
    return (
      <p
        className="text-sm"
        style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
        data-testid="timeline-vazia"
      >
        Nenhuma movimentação recente.
      </p>
    )
  }

  return (
    <ol className="relative flex flex-col gap-0" data-testid="timeline-movimentacoes">
      {movimentacoes.map((mov, idx) => (
        <li key={`${mov.processoId}-${idx}`} className="flex gap-4 pb-6 relative">
          {/* Linha vertical */}
          {idx < movimentacoes.length - 1 && (
            <span
              className="absolute left-[7px] top-4 bottom-0 w-[2px]"
              style={{ background: 'var(--jr-glass-border, rgba(255,255,255,0.15))' }}
            />
          )}
          {/* Dot */}
          <span
            className="relative mt-1 h-4 w-4 shrink-0 rounded-full ring-2"
            style={{
              background: 'var(--jr-primary, #6366f1)',
              ringColor: 'var(--jr-primary, #6366f1)',
            }}
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/app/crm/${mov.processoId}`}
              className="text-xs font-semibold hover:underline"
              style={{ color: 'var(--jr-primary, #6366f1)' }}
            >
              {mov.numeroCnj}
            </Link>
            {mov.tipo && (
              <span
                className="ml-2 rounded px-1 py-0.5 text-[10px] font-medium uppercase"
                style={{
                  background: 'var(--jr-glass-bg, rgba(99,102,241,0.15))',
                  color: 'var(--jr-primary, #6366f1)',
                }}
              >
                {mov.tipo}
              </span>
            )}
            <p
              className="mt-0.5 text-sm line-clamp-2"
              style={{ color: 'var(--jr-text-primary, #e5e7eb)' }}
            >
              {mov.descricao}
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
            >
              {formatDateTime(mov.dataHora)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
