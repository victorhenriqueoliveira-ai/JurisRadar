'use client';

import { useState, useCallback } from 'react';
import { Plus, X, ArrowDownToLine } from 'lucide-react';
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

type Tab = 'honorarios' | 'cobrancas' | 'assinaturas' | 'inadimplentes' | 'saldo';

const TABS: { id: Tab; label: string }[] = [
  { id: 'honorarios', label: 'Honorários' },
  { id: 'cobrancas', label: 'Cobranças' },
  { id: 'assinaturas', label: 'Assinaturas' },
  { id: 'inadimplentes', label: 'Inadimplentes' },
  { id: 'saldo', label: 'Saldo & Repasses' },
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

const EXTRATO_MOCK = [
  { id: '1', descricao: 'Recebimento — Processo 1234/2026', valor: 5000, tipo: 'entrada' as const, data: '2026-08-28', status: 'Concluído' },
  { id: '2', descricao: 'Saque realizado', valor: -2000, tipo: 'saida' as const, data: '2026-08-20', status: 'Concluído' },
  { id: '3', descricao: 'Recebimento — Honorários consultoria', valor: 1800, tipo: 'entrada' as const, data: '2026-08-15', status: 'Concluído' },
  { id: '4', descricao: 'Saque realizado', valor: -1000, tipo: 'saida' as const, data: '2026-08-05', status: 'Concluído' },
];

function SaqueModal({ onClose }: { onClose: () => void }) {
  const [valor, setValor] = useState('');
  const [conta, setConta] = useState('');
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]">Sacar saldo</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✓</div>
              <p className="font-bold text-[#16a34a] text-lg">Saque solicitado!</p>
              <p className="text-sm text-[#6b7280] mt-1">O valor será processado em até 1 dia útil.</p>
              <button type="button" onClick={onClose} className="mt-5 px-6 py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl">
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor a sacar (R$)</label>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conta destino</label>
                <input
                  type="text"
                  required
                  value={conta}
                  onChange={(e) => setConta(e.target.value)}
                  placeholder="Banco, Ag, CC"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-lg hover:bg-[#1a3f7a] transition-colors">
                  Confirmar saque
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SaldoRepasses() {
  const [showSaque, setShowSaque] = useState(false);

  return (
    <>
      {showSaque && <SaqueModal onClose={() => setShowSaque(false)} />}
      <div className="space-y-6">
        {/* 3 colunas de KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Col 1: navy dark — saldo disponível */}
          <div className="rounded-2xl bg-[#0f2d5e] p-5 text-white flex flex-col gap-3">
            <p className="text-xs font-medium opacity-70">Saldo disponível para saque</p>
            <p className="text-3xl font-extrabold tabular-nums">R$ 24.180,00</p>
            <button
              type="button"
              onClick={() => setShowSaque(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#0f2d5e] text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors w-fit"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Sacar agora
            </button>
          </div>

          {/* Col 2: a liberar */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">A liberar (em processamento)</p>
              <p className="text-3xl font-extrabold tabular-nums text-[#d97706]">R$ 6.900,00</p>
            </div>
            <p className="text-xs text-[#9ca3af] mt-3">Cai em até 2 dias úteis</p>
          </div>

          {/* Col 3: total sacado */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Total já sacado</p>
              <p className="text-3xl font-extrabold tabular-nums text-[#0f2d5e]">R$ 118.400,00</p>
            </div>
            <p className="text-xs text-[#9ca3af] mt-3">Desde o início</p>
          </div>
        </div>

        {/* Extrato — 4 colunas: Data, Descrição, Valor, Status */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#0f2d5e]">Extrato</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-gray-50">
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Data</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Descrição</th>
                <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Valor</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Status</th>
              </tr>
            </thead>
            <tbody>
              {EXTRATO_MOCK.map((item) => (
                <tr key={item.id} className="border-b border-[#f1f5f9]">
                  <td className="px-5 py-3.5 text-[#9ca3af] shrink-0 whitespace-nowrap">
                    {item.data.split('-').reverse().join('/')}
                  </td>
                  <td className="px-5 py-3.5 text-[#374151]">{item.descricao}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap ${
                    item.tipo === 'entrada' ? 'text-[#16a34a]' : 'text-[#dc2626]'
                  }`}>
                    {item.tipo === 'entrada' ? '+' : ''}
                    {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
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

        {activeTab === 'saldo' && (
          <section>
            <SaldoRepasses />
          </section>
        )}
      </div>
    </div>
  );
}
