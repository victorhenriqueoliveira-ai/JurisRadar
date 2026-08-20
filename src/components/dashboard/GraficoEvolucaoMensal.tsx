'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DashboardData } from '@/services/dashboard'

interface GraficoEvolucaoMensalProps {
  data: DashboardData['evolucaoMensal']
}

function formatMesLabel(mes: string): string {
  const [ano, mesNum] = mes.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[parseInt(mesNum, 10) - 1]}/${ano.slice(2)}`
}

export function GraficoEvolucaoMensal({ data }: GraficoEvolucaoMensalProps) {
  const chartData = data.map((item) => ({
    mes: formatMesLabel(item.mes),
    Novos: item.novos,
    Encerrados: item.encerrados,
  }))

  if (chartData.length === 0) {
    return (
      <div
        className="flex h-48 items-center justify-center rounded-lg text-sm"
        style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
        data-testid="grafico-evolucao-vazio"
      >
        Sem dados de evolução mensal
      </div>
    )
  }

  return (
    <div data-testid="grafico-evolucao-mensal">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="Novos"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Encerrados"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
