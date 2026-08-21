'use client';

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { HonorarioTable } from '@/components/financeiro/HonorarioTable';

const TIPOS_HONORARIO = [
  'Contratual',
  'Êxito',
  'Sucumbência',
  'Consultoria',
  'Parecer',
  'Cautelar',
  'Outro',
];

function NovoHonorarioModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState('Contratual');
  const [tipoCustom, setTipoCustom] = useState('');
  const [valor, setValor] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const tipoFinal = tipo === 'Outro' ? tipoCustom.trim() : tipo;
    if (!tipoFinal) { setError('Informe o tipo de honorário.'); return; }
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum < 0) { setError('Informe um valor válido.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/financeiro/honorarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoFinal,
          valor: valorNum,
          dataPrevista: dataPrevista || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Erro ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]">Novo Honorário</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS_HONORARIO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {tipo === 'Outro' && (
              <input
                type="text"
                placeholder="Descreva o tipo"
                value={tipoCustom}
                onChange={(e) => setTipoCustom(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vencimento <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-md hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {showModal && (
        <NovoHonorarioModal onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Financeiro
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">Acompanhe honorários e pagamentos dos seus processos.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Honorário
        </button>
      </div>

      {/* KPIs */}
      <section>
        <h2 className="text-sm font-semibold text-[#374151] mb-3 uppercase tracking-wide">Resumo do período</h2>
        <DashboardFinanceiro />
      </section>

      {/* Tabela */}
      <section>
        <h2 className="text-sm font-semibold text-[#374151] mb-3 uppercase tracking-wide">Honorários</h2>
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
          <HonorarioTable key={refreshKey} />
        </div>
      </section>
    </div>
  );
}
