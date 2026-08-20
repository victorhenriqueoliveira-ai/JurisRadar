import { Suspense } from 'react'
import { GlassCard } from '@/components/ui-custom/GlassCard'
import { DashboardKpis } from '@/components/dashboard/DashboardKpis'
import { GraficoDistribuicaoStatus } from '@/components/dashboard/GraficoDistribuicaoStatus'
import { GraficoAreaDireito } from '@/components/dashboard/GraficoAreaDireito'
import { GraficoEvolucaoMensal } from '@/components/dashboard/GraficoEvolucaoMensal'
import { ListaPrazosUrgentes } from '@/components/dashboard/ListaPrazosUrgentes'
import { TimelineMovimentacoes } from '@/components/dashboard/TimelineMovimentacoes'
import { requireOrgContext } from '@/lib/org-context'
import { aggregateDashboard, getPrazosUrgentes, getMovimentacoesRecentes } from '@/services/dashboard'
import type { DashboardData, PrazoUrgente, MovimentacaoRecente } from '@/services/dashboard'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl"
          style={{ background: 'var(--jr-glass-bg, rgba(255,255,255,0.05))' }}
        />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div
      className="h-56 animate-pulse rounded-xl"
      style={{ background: 'var(--jr-glass-bg, rgba(255,255,255,0.05))' }}
    />
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg"
          style={{ background: 'var(--jr-glass-bg, rgba(255,255,255,0.05))' }}
        />
      ))}
    </div>
  )
}

// ── Componentes de dados ───────────────────────────────────────────────────────

async function DashboardContent() {
  const ctx = await requireOrgContext()

  const [dashData, prazos, movimentacoes] = await Promise.all([
    aggregateDashboard(ctx, 'pessoal'),
    getPrazosUrgentes(ctx),
    getMovimentacoesRecentes(ctx),
  ])

  return <DashboardInner data={dashData} prazos={prazos} movimentacoes={movimentacoes} />
}

function DashboardInner({
  data,
  prazos,
  movimentacoes,
}: {
  data: DashboardData
  prazos: PrazoUrgente[]
  movimentacoes: MovimentacaoRecente[]
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <DashboardKpis data={data} />

      {/* Gráficos — linha 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard>
          <h2
            className="mb-4 text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
          >
            Distribuição por Status
          </h2>
          <GraficoDistribuicaoStatus data={data.distribuicaoStatus} />
        </GlassCard>

        <GlassCard>
          <h2
            className="mb-4 text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
          >
            Por Área do Direito
          </h2>
          <GraficoAreaDireito data={data.distribuicaoArea} />
        </GlassCard>
      </div>

      {/* Gráfico evolução mensal */}
      <GlassCard>
        <h2
          className="mb-4 text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
        >
          Evolução Mensal (últimos 6 meses)
        </h2>
        <GraficoEvolucaoMensal data={data.evolucaoMensal} />
      </GlassCard>

      {/* Prazos urgentes + Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard>
          <h2
            className="mb-4 text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
          >
            Prazos Críticos
          </h2>
          <ListaPrazosUrgentes prazos={prazos} />
        </GlassCard>

        <GlassCard>
          <h2
            className="mb-4 text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
          >
            Movimentações Recentes
          </h2>
          <TimelineMovimentacoes movimentacoes={movimentacoes} />
        </GlassCard>
      </div>
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--jr-text-primary, #f9fafb)' }}
        >
          Dashboard
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--jr-text-secondary, #6b7280)' }}
        >
          Visão geral dos seus processos e prazos
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <KpiSkeleton />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
            <ChartSkeleton />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ListSkeleton />
              <ListSkeleton />
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </main>
  )
}
