'use client'

import { GlassCard } from '@/components/ui-custom/GlassCard'
import type { DashboardData } from '@/services/dashboard'

interface DashboardKpisProps {
  data: Pick<DashboardData, 'totalAtivos' | 'urgenciaAlta' | 'prazos7Dias' | 'intimacoesNaoLidas'>
}

interface KpiItem {
  label: string
  value: number
  description: string
  variant?: 'default' | 'warning' | 'danger'
}

export function DashboardKpis({ data }: DashboardKpisProps) {
  const kpis: KpiItem[] = [
    {
      label: 'Processos Ativos',
      value: data.totalAtivos,
      description: 'Total de processos em andamento',
      variant: 'default',
    },
    {
      label: 'Urgência Alta',
      value: data.urgenciaAlta,
      description: 'Prazos vencendo em 2 dias',
      variant: data.urgenciaAlta > 0 ? 'danger' : 'default',
    },
    {
      label: 'Prazos em 7 dias',
      value: data.prazos7Dias,
      description: 'Compromissos na próxima semana',
      variant: data.prazos7Dias > 0 ? 'warning' : 'default',
    },
    {
      label: 'Intimações não lidas',
      value: data.intimacoesNaoLidas,
      description: 'Notificações pendentes de leitura',
      variant: data.intimacoesNaoLidas > 0 ? 'warning' : 'default',
    },
  ]

  const variantColors: Record<string, string> = {
    default: 'var(--jr-primary, #6366f1)',
    warning: 'var(--jr-warning, #f59e0b)',
    danger: 'var(--jr-danger, #ef4444)',
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="dashboard-kpis">
      {kpis.map((kpi) => (
        <GlassCard key={kpi.label} className="flex flex-col gap-2">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
          >
            {kpi.label}
          </p>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{ color: variantColors[kpi.variant ?? 'default'] }}
          >
            {kpi.value}
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--jr-text-secondary, #9ca3af)' }}
          >
            {kpi.description}
          </p>
        </GlassCard>
      ))}
    </div>
  )
}
