'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DashboardData } from '@/services/dashboard'

interface GraficoAreaDireitoProps {
  data: DashboardData['distribuicaoArea']
}

export function GraficoAreaDireito({ data }: GraficoAreaDireitoProps) {
  const chartData = data.map((item) => ({
    area: item.area.charAt(0).toUpperCase() + item.area.slice(1),
    processos: item.count,
  }))

  if (chartData.length === 0) {
    return (
      <div
        className="flex h-48 items-center justify-center rounded-lg text-sm"
        style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
        data-testid="grafico-area-vazio"
      >
        Nenhum processo por área registrado
      </div>
    )
  }

  return (
    <div className="overflow-x-auto" data-testid="grafico-area-direito">
      <div style={{ minWidth: Math.max(chartData.length * 80, 300) }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="area"
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(value: number) => [value, 'Processos']} />
            <Bar dataKey="processos" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
