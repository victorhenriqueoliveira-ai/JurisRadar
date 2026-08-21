'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface DashboardData {
  totalAReceber: number;
  totalRecebido: number;
  emAtraso: number;
  periodo: { inicio: string; fim: string };
}

interface DashboardFinanceiroProps {
  /** Período inicial no formato YYYY-MM. Padrão: mês atual. */
  inicioPeriodo?: string;
  /** Período final no formato YYYY-MM. Padrão: mês atual. */
  fimPeriodo?: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const KPI_CARDS: {
  key: keyof Omit<DashboardData, 'periodo'>;
  label: string;
  color: string;
}[] = [
  { key: 'totalAReceber', label: 'A receber', color: '#3b82f6' },
  { key: 'totalRecebido', label: 'Recebido', color: '#10b981' },
  { key: 'emAtraso', label: 'Em atraso', color: '#ef4444' },
];

/**
 * DashboardFinanceiro — 3 KPI cards: a receber, recebido, em atraso.
 * Busca dados via GET /api/financeiro.
 */
export function DashboardFinanceiro({ inicioPeriodo, fimPeriodo }: DashboardFinanceiroProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inicio, setInicio] = useState(
    inicioPeriodo ?? new Date().toISOString().slice(0, 7),
  );
  const [fim, setFim] = useState(
    fimPeriodo ?? new Date().toISOString().slice(0, 7),
  );

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (inicio) params.set('inicio', inicio);
      if (fim) params.set('fim', fim);
      const res = await fetch(`/api/financeiro?${params}`);
      if (!res.ok) throw new Error('Erro ao buscar dashboard financeiro');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [inicio, fim]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const inputStyle: React.CSSProperties = {
    padding: '0.375rem 0.625rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    background: '#ffffff',
    color: 'var(--jr-primary)',
    fontSize: '0.8125rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filtro de período */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.8125rem', color: 'var(--jr-primary)', opacity: 0.7 }}>
          Período:
        </label>
        <input
          type="month"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          style={inputStyle}
          aria-label="Início do período"
        />
        <span style={{ color: 'var(--jr-primary)', opacity: 0.5, fontSize: '0.8125rem' }}>até</span>
        <input
          type="month"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          style={inputStyle}
          aria-label="Fim do período"
        />
      </div>

      {/* KPI cards */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          {KPI_CARDS.map((card) => (
            <div
              key={card.key}
              style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                opacity: 0.5,
              }}
            >
              <div style={{ height: '1rem', width: '60%', background: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
              <div style={{ height: '1.5rem', width: '80%', background: '#e5e7eb', borderRadius: '0.25rem' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <p style={{ color: 'var(--jr-danger)', fontSize: '0.875rem' }}>{error}</p>
      ) : data ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          {KPI_CARDS.map((card) => (
            <div
              key={card.key}
              style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                backdropFilter: 'blur(12px)',
              }}
            >
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {card.label}
              </p>
              <p style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: card.color }}>
                {formatCurrency(data[card.key])}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default DashboardFinanceiro;
