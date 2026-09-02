'use client';

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { HonorarioTable } from '@/components/financeiro/HonorarioTable';
import { CobrancaForm } from '@/components/financeiro/CobrancaForm';
import { AssinaturaForm } from '@/components/financeiro/AssinaturaForm';
import { CobrancaList } from '@/components/financeiro/CobrancaList';
import { RelatorioInadimplentes } from '@/components/financeiro/RelatorioInadimplentes';

const TIPOS_HONORARIO = [
  'Contratual',
  'Êxito',
  'Sucumbência',
  'Consultoria',
  'Parecer',
  'Cautelar',
  'Outro',
];

type Tab = 'honorarios' | 'cobrancas' | 'assinaturas' | 'inadimplentes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'honorarios', label: 'Honorários' },
  { id: 'cobrancas', label: 'Cobranças' },
  { id: 'assinaturas', label: 'Assinaturas' },
  { id: 'inadimplentes', label: 'Inadimplentes' },
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

function NovaCobrancaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-[#0f2d5e]">Nova Cobrança</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">
          <CobrancaForm onSuccess={() => { onSaved(); }} />
        </div>
      </div>
    </div>
  );
}

function NovaAssinaturaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-[#0f2d5e]">Nova Assinatura Recorrente</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">
          <AssinaturaForm onSuccess={() => { onSaved(); }} />
        </div>
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<Tab>('honorarios');
  const [showHonorarioModal, setShowHonorarioModal] = useState(false);
  const [showCobrancaModal, setShowCobrancaModal] = useState(false);
  const [showAssinaturaModal, setShowAssinaturaModal] = useState(false);
  const [honorarioRefreshKey, setHonorarioRefreshKey] = useState(0);
  const [cobrancaRefreshKey, setCobrancaRefreshKey] = useState(0);

  const handleHonorarioSaved = useCallback(() => {
    setHonorarioRefreshKey((k: number) => k + 1);
  }, []);

  const handleCobrancaSaved = useCallback(() => {
    setCobrancaRefreshKey((k: number) => k + 1);
    setShowCobrancaModal(false);
  }, []);

  const handleAssinaturaSaved = useCallback(() => {
    setShowAssinaturaModal(false);
  }, []);

  function getTabCTA() {
    switch (activeTab) {
      case 'honorarios':
        return (
          <button
            type="button"
            onClick={() => setShowHonorarioModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Honorário
          </button>
        );
      case 'cobrancas':
        return (
          <button
            type="button"
            onClick={() => setShowCobrancaModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Cobrança
          </button>
        );
      case 'assinaturas':
        return (
          <button
            type="button"
            onClick={() => setShowAssinaturaModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Assinatura
          </button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Modais */}
      {showHonorarioModal && (
        <NovoHonorarioModal
          onClose={() => setShowHonorarioModal(false)}
          onSaved={handleHonorarioSaved}
        />
      )}
      {showCobrancaModal && (
        <NovaCobrancaModal
          onClose={() => setShowCobrancaModal(false)}
          onSaved={handleCobrancaSaved}
        />
      )}
      {showAssinaturaModal && (
        <NovaAssinaturaModal
          onClose={() => setShowAssinaturaModal(false)}
          onSaved={handleAssinaturaSaved}
        />
      )}

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Financeiro
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Acompanhe honorários, cobranças e inadimplentes do escritório.
          </p>
        </div>
        {getTabCTA()}
      </div>

      {/* KPIs */}
      <section>
        <h2 className="text-sm font-semibold text-[#374151] mb-3 uppercase tracking-wide">Resumo do período</h2>
        <DashboardFinanceiro />
      </section>

      {/* Abas */}
      <div>
        <div className="flex gap-0 border-b border-[#e5e7eb] mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-[#0f2d5e] border-[#0f2d5e]'
                  : 'text-[#9ca3af] border-transparent hover:text-[#374151]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        {activeTab === 'honorarios' && (
          <section>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
              <HonorarioTable key={honorarioRefreshKey} />
            </div>
          </section>
        )}

        {activeTab === 'cobrancas' && (
          <section>
            <CobrancaList refreshKey={cobrancaRefreshKey} />
          </section>
        )}

        {activeTab === 'assinaturas' && (
          <section>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm text-center text-sm text-gray-400">
              <p className="mb-2 font-medium text-gray-600">Assinaturas recorrentes</p>
              <p>Crie uma nova assinatura pelo botão acima.</p>
            </div>
          </section>
        )}

        {activeTab === 'inadimplentes' && (
          <section>
            <RelatorioInadimplentes />
          </section>
        )}
      </div>
    </div>
  );
}
