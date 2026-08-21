'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DashboardData } from '@/services/dashboard'

interface GraficoDistribuicaoStatusProps {
  data: DashboardData['distribuicaoStatus']
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  arquivado: 'Arquivado',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
}

export function GraficoDistribuicaoStatus({ data }: GraficoDistribuicaoStatusProps) {
  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    value: item.count,
  }))

  if (chartData.length === 0) {
    return (
      <div
        className="flex h-48 items-center justify-center rounded-lg text-sm"
        style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
        data-testid="grafico-status-vazio"
      >
        Nenhum processo registrado
      </div>
    )
  }

  return (
    <div data-testid="grafico-distribuicao-status">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [value, 'Processos']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
