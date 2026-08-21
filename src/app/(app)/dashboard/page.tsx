import { Suspense } from 'react'
import { aggregateDashboard, getPrazosUrgentes, getMovimentacoesRecentes } from '@/services/dashboard'
import { GraficoDistribuicaoStatus } from '@/components/dashboard/GraficoDistribuicaoStatus'
import { GraficoAreaDireito } from '@/components/dashboard/GraficoAreaDireito'
import { GraficoEvolucaoMensal } from '@/components/dashboard/GraficoEvolucaoMensal'
import { ListaPrazosUrgentes } from '@/components/dashboard/ListaPrazosUrgentes'
import { TimelineMovimentacoes } from '@/components/dashboard/TimelineMovimentacoes'
import { requireOrgContext } from '@/lib/org-context'
import type { DashboardData, PrazoUrgente, MovimentacaoRecente } from '@/services/dashboard'

// ── Card base ─────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-[18px] border border-[#e5e7eb] p-6 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[.06em] text-[#9ca3af] mb-4">
      {children}
    </p>
  )
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────

const KPI_CONFIG = [
  {
    key: 'totalAtivos' as const,
    label: 'Processos Ativos',
    description: 'Total de processos em andamento',
    color: '#0f2d5e',
  },
  {
    key: 'urgenciaAlta' as const,
    label: 'Urgência Alta',
    description: 'Prazos vencendo em 2 dias',
    color: '#dc2626',
  },
  {
    key: 'prazos7Dias' as const,
    label: 'Prazos em 7 dias',
    description: 'Compromissos na próxima semana',
    color: '#d97706',
  },
  {
    key: 'intimacoesNaoLidas' as const,
    label: 'Intimações não lidas',
    description: 'Notificações pendentes de leitura',
    color: '#0f2d5e',
  },
]

function KpiCards({ data }: { data: Pick<DashboardData, 'totalAtivos' | 'urgenciaAlta' | 'prazos7Dias' | 'intimacoesNaoLidas'> }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="dashboard-kpis">
      {KPI_CONFIG.map(({ key, label, description, color }) => (
        <Card key={key} className="flex flex-col gap-2">
          <p className="text-sm text-[#6b7280]">{label}</p>
          <p className="text-4xl font-bold tabular-nums" style={{ color }}>
            {data[key]}
          </p>
          <p className="text-xs text-[#9ca3af]">{description}</p>
        </Card>
      ))}
    </div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-[18px] bg-white border border-[#e5e7eb]" />
      ))}
    </div>
  )
}

function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`h-56 animate-pulse rounded-[18px] bg-white border border-[#e5e7eb] ${className}`} />
  )
}

// ── Async data component ───────────────────────────────────────────────────────

async function DashboardContent() {
  let dashData: DashboardData
  let prazos: PrazoUrgente[]
  let movimentacoes: MovimentacaoRecente[]

  try {
    const ctx = await requireOrgContext()
    ;[dashData, prazos, movimentacoes] = await Promise.all([
      aggregateDashboard(ctx, 'pessoal'),
      getPrazosUrgentes(ctx),
      getMovimentacoesRecentes(ctx),
    ])
  } catch {
    // DB not connected or no org context — render empty state
    dashData = {
      totalAtivos: 0,
      urgenciaAlta: 0,
      prazos7Dias: 0,
      intimacoesNaoLidas: 0,
      distribuicaoStatus: [],
      distribuicaoArea: [],
      evolucaoMensal: [],
    }
    prazos = []
    movimentacoes = []
  }

  return (
    <div className="flex flex-col gap-6">
      <KpiCards data={dashData} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Distribuição por Status</CardTitle>
          <GraficoDistribuicaoStatus data={dashData.distribuicaoStatus} />
        </Card>
        <Card>
          <CardTitle>Por Área do Direito</CardTitle>
          <GraficoAreaDireito data={dashData.distribuicaoArea} />
        </Card>
      </div>

      <Card>
        <CardTitle>Evolução Mensal (Últimos 6 Meses)</CardTitle>
        <GraficoEvolucaoMensal data={dashData.evolucaoMensal} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Prazos Críticos</CardTitle>
          <ListaPrazosUrgentes prazos={prazos} />
        </Card>
        <Card>
          <CardTitle>Movimentações Recentes</CardTitle>
          <TimelineMovimentacoes movimentacoes={movimentacoes} />
        </Card>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-2xl font-extrabold text-[#0f2d5e]"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        Dashboard
      </h1>
      <p className="text-sm text-[#6b7280]">Visão geral dos seus processos e prazos</p>
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
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  )
}
