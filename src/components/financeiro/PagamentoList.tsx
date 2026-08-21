'use client';

import React, { useState } from 'react';

export interface Pagamento {
  id: string;
  valor: number | string;
  pagoEm: string;
  observacao?: string | null;
}

interface PagamentoListProps {
  pagamentos: Pagamento[];
  honorarioId: string;
  valorTotal: number;
  onAddPagamento?: (data: { valor: number; dataPagamento: string; descricao?: string }) => Promise<void>;
  onRemovePagamento?: (pagamentoId: string) => Promise<void>;
  readOnly?: boolean;
}

function formatCurrency(value: number | string | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-BR');
}

function calcularStatus(valorTotal: number, pagamentos: { valor: number | string }[]): 'pendente' | 'parcial' | 'quitado' {
  const totalPago = pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
  if (totalPago <= 0) return 'pendente';
  if (totalPago >= valorTotal) return 'quitado';
  return 'parcial';
}

const statusColors: Record<string, string> = {
  pendente: '#f59e0b',
  parcial: '#3b82f6',
  quitado: '#10b981',
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  quitado: 'Quitado',
};

/**
 * PagamentoList — lista de parcelas pagas com botão de adicionar e status calculado.
 * Funciona em mobile: formulário de pagamento inline.
 */
export function PagamentoList({
  pagamentos,
  honorarioId: _honorarioId,
  valorTotal,
  onAddPagamento,
  onRemovePagamento,
  readOnly = false,
}: PagamentoListProps) {
  const [showForm, setShowForm] = useState(false);
  const [valorStr, setValorStr] = useState('');
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const status = calcularStatus(valorTotal, pagamentos);
  const totalPago = pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);

  async function handleAddPagamento(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      setError('Informe um valor positivo.');
      return;
    }
    if (!dataPagamento) {
      setError('Informe a data do pagamento.');
      return;
    }

    try {
      setLoading(true);
      await onAddPagamento?.({ valor, dataPagamento, descricao: descricao || undefined });
      setValorStr('');
      setDescricao('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pagamento.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm('Confirmar remoção do pagamento?')) return;
    try {
      setRemovingId(id);
      await onRemovePagamento?.(id);
    } finally {
      setRemovingId(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.375rem 0.625rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    background: '#ffffff',
    color: 'var(--jr-primary)',
    fontSize: '0.8125rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Status e totais */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: statusColors[status] ?? 'var(--jr-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {statusLabels[status]}
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--jr-primary)' }}>
          {formatCurrency(totalPago)} / {formatCurrency(valorTotal)}
        </span>
      </div>

      {/* Lista de pagamentos */}
      {pagamentos.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--jr-primary)', opacity: 0.5, margin: 0 }}>
          Nenhum pagamento registrado.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {pagamentos.map((pg) => (
            <li
              key={pg.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--jr-primary)' }}>
                  {formatCurrency(pg.valor)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6, marginLeft: '0.5rem' }}>
                  {formatDate(pg.pagoEm)}
                </span>
                {pg.observacao && (
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.5 }}>
                    {pg.observacao}
                  </span>
                )}
              </div>
              {!readOnly && onRemovePagamento && (
                <button
                  type="button"
                  onClick={() => handleRemove(pg.id)}
                  disabled={removingId === pg.id}
                  aria-label="Remover pagamento"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--jr-danger)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    opacity: removingId === pg.id ? 0.5 : 0.8,
                    padding: '0.25rem 0.5rem',
                  }}
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Botão e formulário de adicionar */}
      {!readOnly && onAddPagamento && (
        <>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px dashed #e5e7eb',
                borderRadius: '0.375rem',
                background: 'transparent',
                color: 'var(--jr-primary)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                opacity: 0.8,
              }}
            >
              + Registrar pagamento
            </button>
          ) : (
            <form
              onSubmit={handleAddPagamento}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--jr-primary)', display: 'block', marginBottom: '0.2rem' }}>
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={valorStr}
                    onChange={(e) => setValorStr(e.target.value)}
                    placeholder="0,00"
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--jr-primary)', display: 'block', marginBottom: '0.2rem' }}>
                    Data
                  </label>
                  <input
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--jr-primary)', display: 'block', marginBottom: '0.2rem' }}>
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Parcela 1/3"
                  style={inputStyle}
                />
              </div>
              {error && (
                <p style={{ color: 'var(--jr-danger)', fontSize: '0.75rem', margin: 0 }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null); }}
                  disabled={loading}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    background: 'transparent',
                    color: 'var(--jr-primary)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    background: 'var(--jr-primary)',
                    color: 'var(--jr-primary-foreground, #fff)',
                    fontSize: '0.8125rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default PagamentoList;
