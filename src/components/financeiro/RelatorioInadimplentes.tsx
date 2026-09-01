'use client';

/**
 * RelatorioInadimplentes — Lista clientes com cobranças vencidas.
 * Consome GET /api/asaas/inadimplentes e POST /api/asaas/cobrancas/[id]/reenviar.
 */

import React, { useEffect, useState, useCallback } from 'react';

export interface InadimplenteRow {
  id: string;
  clienteNome: string;
  clienteEmail: string;
  clienteCpfCnpj: string;
  valor: string;
  vencimento: string;
  diasAtraso: number;
  cobrancaId: string;
}

interface RelatorioInadimplentesProps {
  diasAtraso?: number;
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

export function RelatorioInadimplentes({ diasAtraso = 1 }: RelatorioInadimplentesProps) {
  const [inadimplentes, setInadimplentes] = useState<InadimplenteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState<Set<string>>(new Set());
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [diasFiltro, setDiasFiltro] = useState(diasAtraso);

  const fetchInadimplentes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('dias_atraso', String(diasFiltro));
      const res = await fetch(`/api/asaas/inadimplentes?${params}`);
      if (!res.ok) throw new Error('Erro ao buscar inadimplentes');
      const json = await res.json() as { inadimplentes: InadimplenteRow[] };
      setInadimplentes(json.inadimplentes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [diasFiltro]);

  useEffect(() => {
    fetchInadimplentes();
  }, [fetchInadimplentes]);

  async function handleReenviar(cobrancaId: string) {
    setReenviando((prev: Set<string>) => { const s = new Set(prev); s.add(cobrancaId); return s; });
    setFeedbacks((prev: Record<string, string>) => ({ ...prev, [cobrancaId]: '' }));
    try {
      const res = await fetch(`/api/asaas/cobrancas/${cobrancaId}/reenviar`, {
        method: 'POST',
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `Erro ${res.status}`);
      }
      setFeedbacks((prev: Record<string, string>) => ({ ...prev, [cobrancaId]: 'Cobrança reenviada!' }));
    } catch (err) {
      setFeedbacks((prev: Record<string, string>) => ({
        ...prev,
        [cobrancaId]: err instanceof Error ? err.message : 'Erro ao reenviar',
      }));
    } finally {
      setReenviando((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(cobrancaId);
        return next;
      });
    }
  }

  return (
    <div data-testid="relatorio-inadimplentes" className="space-y-4">
      {/* Filtro de dias de atraso */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">
          Dias de atraso mínimo:
        </label>
        <input
          type="number"
          min="1"
          value={diasFiltro}
          onChange={(e) => setDiasFiltro(Math.max(1, parseInt(e.target.value, 10) || 1))}
          data-testid="filtro-dias-atraso"
          className="w-20 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={fetchInadimplentes}
          className="px-3 py-1.5 text-sm font-medium text-white bg-[#0f2d5e] rounded-md hover:bg-[#1a3f7a] transition-colors"
        >
          Filtrar
        </button>
      </div>

      {loading && (
        <div data-testid="inadimplentes-loading" className="py-8 text-center text-sm text-gray-400">
          Carregando inadimplentes…
        </div>
      )}

      {error && (
        <div
          role="alert"
          data-testid="inadimplentes-error"
          className="py-4 text-center text-sm text-red-600"
        >
          {error}
        </div>
      )}

      {!loading && !error && inadimplentes.length === 0 && (
        <div data-testid="inadimplentes-empty" className="py-8 text-center text-sm text-gray-400">
          Nenhum cliente inadimplente encontrado.
        </div>
      )}

      {!loading && !error && inadimplentes.length > 0 && (
        <div className="overflow-x-auto rounded-[18px] border border-[#e5e7eb] bg-white">
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
                  Dias em atraso
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.06em] text-[#9ca3af]">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {inadimplentes.map((row: InadimplenteRow) => {
                const isReenviando = reenviando.has(row.cobrancaId);
                const feedback = feedbacks[row.cobrancaId];

                return (
                  <tr
                    key={row.id}
                    data-testid="inadimplente-row"
                    className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0f2d5e]">{row.clienteNome}</div>
                      <div className="text-xs text-gray-400">{row.clienteEmail}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-red-700">
                      {formatCurrency(row.valor)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#374151]">
                      {formatDate(row.vencimento)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        {row.diasAtraso}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleReenviar(row.cobrancaId)}
                          disabled={isReenviando}
                          data-testid={`btn-reenviar-cobranca-${row.cobrancaId}`}
                          className="px-3 py-1 text-xs font-medium text-white bg-[#0f2d5e] rounded-md hover:bg-[#1a3f7a] transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {isReenviando ? 'Reenviando…' : 'Reenviar cobrança'}
                        </button>
                        {feedback && (
                          <span
                            data-testid={`feedback-reenvio-${row.cobrancaId}`}
                            className={`text-xs ${feedback.includes('Erro') || feedback.includes('erro') ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {feedback}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RelatorioInadimplentes;
