'use client';

import React, { useEffect, useState, useCallback } from 'react';

type StatusPagamento = 'pendente' | 'parcial' | 'quitado';

interface HonorarioRow {
  id: string;
  processoId?: string | null;
  tipo: string;
  valor?: string | null;
  dataPrevista?: string | null;
  statusPagamento: StatusPagamento;
}

interface HonorarioTableFilters {
  status?: StatusPagamento | '';
  inicio?: string;
  fim?: string;
}

const statusColors: Record<StatusPagamento, string> = {
  pendente: '#f59e0b',
  parcial: '#3b82f6',
  quitado: '#10b981',
};

const statusLabels: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  quitado: 'Quitado',
};

function formatCurrency(value: string | number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-BR');
}

/**
 * HonorarioTable — tabela com filtros de status e período.
 * Busca dados via GET /api/financeiro/honorarios.
 */
export function HonorarioTable() {
  const [rows, setRows] = useState<HonorarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<HonorarioTableFilters>({ status: '', inicio: '', fim: '' });

  const fetchData = useCallback(async (cursor?: string, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.inicio) params.set('inicio', filters.inicio);
      if (filters.fim) params.set('fim', filters.fim);
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/financeiro/honorarios?${params}`);
      if (!res.ok) throw new Error('Erro ao buscar honorários');
      const json = await res.json();

      setRows((prev) => append ? [...prev, ...json.data] : json.data);
      setNextCursor(json.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setRows([]);
    fetchData();
  }, [fetchData]);

  const inputStyle: React.CSSProperties = {
    padding: '0.375rem 0.625rem',
    border: '1px solid var(--jr-glass-border)',
    borderRadius: '0.375rem',
    background: 'var(--jr-glass-bg)',
    color: 'var(--jr-primary)',
    fontSize: '0.8125rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StatusPagamento | '' }))}
          style={inputStyle}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="parcial">Parcial</option>
          <option value="quitado">Quitado</option>
        </select>
        <input
          type="month"
          value={filters.inicio ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, inicio: e.target.value }))}
          style={inputStyle}
          aria-label="Início do período"
          placeholder="De"
        />
        <input
          type="month"
          value={filters.fim ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, fim: e.target.value }))}
          style={inputStyle}
          aria-label="Fim do período"
          placeholder="Até"
        />
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        {error ? (
          <p style={{ color: 'var(--jr-danger)', fontSize: '0.875rem' }}>{error}</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              color: 'var(--jr-primary)',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--jr-glass-border)' }}>
                {['Tipo', 'Valor', 'Vencimento', 'Status'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      opacity: 0.6,
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '1rem 0.75rem', opacity: 0.5 }}>
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '1rem 0.75rem', opacity: 0.5 }}>
                    Nenhum honorário encontrado.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: '1px solid var(--jr-glass-border)' }}
                  >
                    <td style={{ padding: '0.625rem 0.75rem' }}>{row.tipo}</td>
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>
                      {formatCurrency(row.valor)}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      {formatDate(row.dataPrevista)}
                    </td>
                    <td style={{ padding: '0.625rem 0.75rem' }}>
                      <span
                        style={{
                          color: statusColors[row.statusPagamento] ?? 'inherit',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        {statusLabels[row.statusPagamento] ?? row.statusPagamento}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {nextCursor && (
        <button
          type="button"
          onClick={() => fetchData(nextCursor, true)}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--jr-glass-border)',
            borderRadius: '0.375rem',
            background: 'transparent',
            color: 'var(--jr-primary)',
            fontSize: '0.8125rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 0.8,
            alignSelf: 'center',
          }}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}

export default HonorarioTable;
