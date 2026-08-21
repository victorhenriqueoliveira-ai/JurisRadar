'use client';

import { useEffect, useState } from 'react';
import { Users, Building2, TrendingUp, Search, Activity, DollarSign } from 'lucide-react';

interface Stats {
  usuarios: { total: number; novosUltimos30Dias: number };
  organizacoes: { total: number; ativas: number; emTrial: number; canceladas: number };
  faturamento: { mrrEstimado: number; arrEstimado: number };
  buscas: { total: number; ultimos30Dias: number; porDia: { day: string; total: number }[] };
  processos: { total: number };
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-[.06em] text-[#9ca3af]">{title}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>{value}</p>
      {sub && <p className="text-xs text-[#9ca3af] mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-2" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-red-600 text-sm">Erro ao carregar estatísticas.</div>;
  }

  const mrrFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.faturamento.mrrEstimado);
  const arrFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.faturamento.arrEstimado);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Dashboard Admin
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Visão geral da plataforma JurisRadar.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard
          title="Usuários"
          value={stats.usuarios.total}
          sub={`+${stats.usuarios.novosUltimos30Dias} nos últimos 30 dias`}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          title="Escritórios"
          value={stats.organizacoes.total}
          sub={`${stats.organizacoes.ativas} ativos · ${stats.organizacoes.emTrial} em trial`}
          icon={Building2}
          color="bg-indigo-50 text-indigo-600"
        />
        <KpiCard
          title="MRR Estimado"
          value={mrrFmt}
          sub={`ARR: ${arrFmt}`}
          icon={DollarSign}
          color="bg-green-50 text-green-600"
        />
        <KpiCard
          title="Buscas (30 dias)"
          value={stats.buscas.ultimos30Dias}
          sub={`Total histórico: ${stats.buscas.total}`}
          icon={Search}
          color="bg-yellow-50 text-yellow-600"
        />
        <KpiCard
          title="Processos monitorados"
          value={stats.processos.total}
          icon={Activity}
          color="bg-purple-50 text-purple-600"
        />
        <KpiCard
          title="Cancelados"
          value={stats.organizacoes.canceladas}
          sub="total histórico"
          icon={TrendingUp}
          color="bg-red-50 text-red-500"
        />
      </div>

      {/* Distribuição de assinaturas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#111827] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Status das assinaturas
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Ativas', value: stats.organizacoes.ativas, color: 'bg-green-500' },
              { label: 'Em trial', value: stats.organizacoes.emTrial, color: 'bg-yellow-400' },
              { label: 'Canceladas / Em atraso', value: stats.organizacoes.canceladas, color: 'bg-red-400' },
            ].map(({ label, value, color }) => {
              const total = stats.organizacoes.total || 1;
              const pct = Math.round((value / total) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#374151] font-medium">{label}</span>
                    <span className="text-[#9ca3af]">{value} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                    <div className={`h-2 ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#111827] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Buscas por dia (últimos 7 dias)
          </h2>
          {stats.buscas.porDia.length === 0 ? (
            <p className="text-sm text-[#9ca3af] py-4 text-center">Sem dados no período.</p>
          ) : (
            <div className="flex items-end gap-2 h-24">
              {stats.buscas.porDia.map(({ day, total }) => {
                const max = Math.max(...stats.buscas.porDia.map((d) => d.total), 1);
                const height = Math.max(8, (total / max) * 80);
                return (
                  <div key={day} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] text-[#9ca3af]">{total}</span>
                    <div
                      className="w-full bg-[#0f2d5e] rounded-t-md"
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-[9px] text-[#9ca3af]">{day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
