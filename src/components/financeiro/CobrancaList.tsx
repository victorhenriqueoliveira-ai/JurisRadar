'use client';

/**
 * CobrancaList — Tabela de cobranças com status badges coloridos e ação de reenvio.
 * Consome GET /api/asaas/cobrancas e POST /api/asaas/cobrancas/[id]/reenviar.
 */

import React, { useEffect, useState, useCallback } from 'react';

export interface CobrancaRow {
  id: string;
  clienteNome: string;
  clienteEmail: string;
  valor: string;
  vencimento: string;
  status: string;
  tipo: string;
  linkBoleto?: string | null;
  linkPix?: string | null;
  createdAt?: string | null;
}

interface CobrancaListProps {
  honorarioId?: string;
  statusFilter?: string;
  /** Chave para forçar recarregamento externo */
  refreshKey?: number;
}

// ── Mapeamento de status ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  pending: {
    label: 'Pendente',
    bg: '#fef9c3',
    color: '#92400e',
    border: '#fde68a',
  },
  received: {
    label: 'Recebida',
    bg: '#dcfce7',
    color: '#166534',
    border: '#86efac',
  },
  confirmed: {
    label: 'Confirmada',
    bg: '#dcfce7',
    color: '#166534',
    border: '#86efac',
  },
  overdue: {
    label: 'Vencida',
    bg: '#fee2e2',
    color: '#991b1b',
    border: '#fca5a5',
  },
  refunded: {
    label: 'Estornada',
    bg: '#f3f4f6',
    color: '#6b7280',
    border: '#e5e7eb',
  },
  cancelled: {
    label: 'Cancelada',
    bg: '#f3f4f6',
    color: '#374151',
    border: '#d1d5db',
  },
};

const REENVIO_STATUSES = new Set(['pending', 'overdue']);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status.toLowerCase()] ?? {
    label: status,
    bg: '#f3f4f6',
    color: '#6b7280',
    border: '#e5e7eb',
  };

  return (
    <span
      data-testid={`status-badge-${status.toLowerCase()}`}
      style={{
        display: 'inline-block',
        padding: '0.125rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR');
}

export function CobrancaList({ honorarioId, statusFilter, refreshKey }: CobrancaListProps) {
  const [cobrancas, setCobrancas] = useState<CobrancaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState<Set<string>>(new Set());
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  const fetchCobrancas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (honorarioId) params.set('honorarioId', honorarioId);

      const res = await fetch(`/api/asaas/cobrancas?${params}`);
      if (!res.ok) throw new Error('Erro ao buscar cobranças');
      const json = await res.json() as { cobrancas: CobrancaRow[] };
      setCobrancas(json.cobrancas ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [honorarioId, statusFilter]);

  useEffect(() => {
    fetchCobrancas();
  }, [fetchCobrancas, refreshKey]);

  async function handleReenviar(id: string) {
    setReenviando((prev: Set<string>) => { const s = new Set(prev); s.add(id); return s; });
    setFeedbacks((prev: Record<string, string>) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/api/asaas/cobrancas/${id}/reenviar`, {
        method: 'POST',
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `Erro ${res.status}`);
      }
      setFeedbacks((prev: Record<string, string>) => ({ ...prev, [id]: 'Cobrança reenviada!' }));
    } catch (err) {
      setFeedbacks((prev: Record<string, string>) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Erro ao reenviar',
      }));
    } finally {
      setReenviando((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div data-testid="cobranca-list-loading" className="py-8 text-center text-sm text-gray-400">
        Carregando cobranças…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        data-testid="cobranca-list-error"
        className="py-4 text-center text-sm text-red-600"
      >
        {error}
      </div>
    );
  }

  if (cobrancas.length === 0) {
    return (
      <div data-testid="cobranca-list-empty" className="py-8 text-center text-sm text-gray-400">
        Nenhuma cobrança encontrada.
      </div>
    );
  }

  return (
    <div data-testid="cobranca-list" className="overflow-x-auto rounded-[18px] border border-[#e5e7eb] bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.06em] text-[#9ca3af]">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.06em] text-[#9ca3af]">
              Valor
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.06em] text-[#9ca3af]">
              Vencimento
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.06em] text-[#9ca3af]">
              Status
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.06em] text-[#9ca3af]">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {cobrancas.map((cobranca: CobrancaRow) => {
            const statusLower = cobranca.status.toLowerCase();
            const podeReenviar = REENVIO_STATUSES.has(statusLower);
            const isReenviando = reenviando.has(cobranca.id);
            const feedback = feedbacks[cobranca.id];

            return (
              <tr
                key={cobranca.id}
                data-testid="cobranca-row"
                className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0f2d5e]">{cobranca.clienteNome}</div>
                  <div className="text-xs text-gray-400">{cobranca.clienteEmail}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[#374151] font-medium">
                  {formatCurrency(cobranca.valor)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[#374151]">
                  {formatDate(cobranca.vencimento)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={cobranca.status} />
                </td>
                <td className="px-4 py-3">
                  {podeReenviar ? (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleReenviar(cobranca.id)}
                        disabled={isReenviando}
                        data-testid={`btn-reenviar-${cobranca.id}`}
                        className="px-3 py-1 text-xs font-medium text-[#0f2d5e] border border-[#0f2d5e] rounded-md hover:bg-[#0f2d5e] hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isReenviando ? 'Reenviando…' : 'Reenviar'}
                      </button>
                      {feedback && (
                        <span
                          data-testid={`feedback-${cobranca.id}`}
                          className={`text-xs ${feedback.includes('Erro') || feedback.includes('erro') ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {feedback}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CobrancaList;
