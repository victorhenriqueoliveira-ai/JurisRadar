'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Users, XCircle } from 'lucide-react';

interface Stats {
  usuarios: { total: number; novosUltimos30Dias: number };
  organizacoes: { total: number; ativas: number; emTrial: number; canceladas: number };
  faturamento: { mrrEstimado: number; arrEstimado: number };
  buscas: { total: number; ultimos30Dias: number };
  processos: { total: number };
}

function Card({ title, value, sub, icon: Icon, accent }: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-[.06em] text-[#9ca3af]">{title}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>{value}</p>
      {sub && <p className="text-xs text-[#9ca3af] mt-1">{sub}</p>}
    </div>
  );
}

export default function FaturamentoPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-red-600 text-sm">Erro ao carregar dados.</div>;
  }

  const churnRate =
    stats.organizacoes.total > 0
      ? ((stats.organizacoes.canceladas / stats.organizacoes.total) * 100).toFixed(1)
      : '0.0';

  const conversionRate =
    (stats.organizacoes.ativas + stats.organizacoes.emTrial + stats.organizacoes.canceladas) > 0
      ? ((stats.organizacoes.ativas / stats.organizacoes.total) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Faturamento
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Métricas de receita e assinaturas.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card
          title="MRR Estimado"
          value={brl(stats.faturamento.mrrEstimado)}
          sub="receita mensal recorrente"
          icon={DollarSign}
          accent="bg-green-50 text-green-600"
        />
        <Card
          title="ARR Estimado"
          value={brl(stats.faturamento.arrEstimado)}
          sub="receita anual recorrente"
          icon={TrendingUp}
          accent="bg-blue-50 text-blue-600"
        />
        <Card
          title="Clientes ativos"
          value={String(stats.organizacoes.ativas)}
          sub={`${conversionRate}% do total`}
          icon={Users}
          accent="bg-indigo-50 text-indigo-600"
        />
        <Card
          title="Taxa de churn"
          value={`${churnRate}%`}
          sub={`${stats.organizacoes.canceladas} cancelados`}
          icon={XCircle}
          accent="bg-red-50 text-red-500"
        />
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm p-5">
        <h2 className="text-sm font-bold text-[#111827] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Breakdown de receita estimada
        </h2>

        <div className="space-y-0 divide-y divide-[#f3f4f6]">
          {[
            {
              label: 'Assinaturas ativas (plano mensal ~R$157)',
              value: brl(stats.faturamento.mrrEstimado),
              detail: `${stats.organizacoes.ativas} clientes`,
            },
            {
              label: 'Em trial (14 dias, sem cobrança agora)',
              value: brl(stats.organizacoes.emTrial * 157),
              detail: `${stats.organizacoes.emTrial} clientes · receita potencial`,
              muted: true,
            },
            {
              label: 'ARR anualizado (base ativa)',
              value: brl(stats.faturamento.arrEstimado),
              detail: 'MRR × 12',
              bold: true,
            },
          ].map(({ label, value, detail, muted, bold }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <div>
                <p className={`text-sm ${muted ? 'text-[#9ca3af]' : bold ? 'font-bold text-[#111827]' : 'text-[#374151]'}`}>{label}</p>
                <p className="text-xs text-[#9ca3af]">{detail}</p>
              </div>
              <p className={`text-sm font-bold ${muted ? 'text-[#9ca3af]' : 'text-[#111827]'}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-[#9ca3af]">
        * Valores estimados com base nas assinaturas ativas no banco. Para dados precisos, consulte o Stripe Dashboard diretamente.
      </p>
    </div>
  );
}
