'use client';

import { useState, useCallback, useEffect } from 'react';
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

interface SaqueRow {
  id: string;
  valor: string;
  taxaTransferencia: string | null;
  valorLiquido: string | null;
  pixAddressKey: string;
  pixAddressKeyType: string;
  status: string;
  failReason: string | null;
  createdAt: string;
}

const STATUS_SAQUE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: '#fef9c3', color: '#92400e' },
  bank_processing: { label: 'Processando', bg: '#fef9c3', color: '#92400e' },
  done: { label: 'Concluído', bg: '#dcfce7', color: '#166534' },
  failed: { label: 'Falhou', bg: '#fee2e2', color: '#991b1b' },
  cancelled: { label: 'Cancelado', bg: '#f3f4f6', color: '#4b5563' },
};

const TIPOS_CHAVE_PIX: { value: string; label: string }[] = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'EVP', label: 'Chave aleatória' },
];

function formatBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SaqueModal({ saldoDisponivel, onClose, onSaved }: { saldoDisponivel: number; onClose: () => void; onSaved: () => void }) {
  const [valor, setValor] = useState('');
  const [pixAddressKey, setPixAddressKey] = useState('');
  const [pixAddressKeyType, setPixAddressKeyType] = useState('EMAIL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const valorNumerico = Number(valor.replace(/\./g, '').replace(',', '.'));
    if (!valorNumerico || valorNumerico <= 0) {
      setError('Informe um valor válido.');
      return;
    }
    if (!pixAddressKey.trim()) {
      setError('Informe a chave Pix de destino.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/financeiro/saques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: valorNumerico, pixAddressKey: pixAddressKey.trim(), pixAddressKeyType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Não foi possível solicitar o saque.');
        return;
      }
      setDone(true);
      onSaved();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
              <p className="text-sm text-[#6b7280] mt-1">
                Acompanhe o status no extrato. A transferência Pix é processada pela Asaas e pode levar até 1 dia útil.
              </p>
              <button type="button" onClick={onClose} className="mt-5 px-6 py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl">
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#6b7280]">
                Saldo disponível: <span className="font-semibold text-[#0f2d5e]">{formatBRL(saldoDisponivel)}</span>
              </p>
              {error && (
                <p className="text-sm text-[#dc2626] bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de chave Pix</label>
                <select
                  value={pixAddressKeyType}
                  onChange={(e) => setPixAddressKeyType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
                >
                  {TIPOS_CHAVE_PIX.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix de destino</label>
                <input
                  type="text"
                  required
                  value={pixAddressKey}
                  onChange={(e) => setPixAddressKey(e.target.value)}
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-lg hover:bg-[#1a3f7a] transition-colors disabled:opacity-60">
                  {loading ? 'Enviando...' : 'Confirmar saque'}
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
  const [saldo, setSaldo] = useState<number | null>(null);
  const [saldoError, setSaldoError] = useState('');
  const [saques, setSaques] = useState<SaqueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [saldoRes, saquesRes] = await Promise.all([
        fetch('/api/financeiro/saldo'),
        fetch('/api/financeiro/saques'),
      ]);

      if (saldoRes.ok) {
        const saldoJson = await saldoRes.json();
        setSaldo(saldoJson.saldo);
        setSaldoError('');
      } else {
        const saldoJson = await saldoRes.json();
        setSaldo(null);
        setSaldoError(saldoJson.error ?? 'Não foi possível consultar o saldo.');
      }

      if (saquesRes.ok) {
        const saquesJson = await saquesRes.json();
        setSaques(saquesJson.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totalSacado = saques
    .filter((s) => s.status === 'done')
    .reduce((acc, s) => acc + Number(s.valorLiquido ?? s.valor), 0);
  const emProcessamento = saques
    .filter((s) => s.status === 'pending' || s.status === 'bank_processing')
    .reduce((acc, s) => acc + Number(s.valor), 0);

  return (
    <>
      {showSaque && saldo != null && (
        <SaqueModal saldoDisponivel={saldo} onClose={() => setShowSaque(false)} onSaved={carregar} />
      )}
      <div className="space-y-6">
        {saldoError && (
          <p className="text-sm text-[#991b1b] bg-red-50 border border-red-100 rounded-xl px-4 py-3">{saldoError}</p>
        )}

        {/* 3 colunas de KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Col 1: navy dark — saldo disponível */}
          <div className="rounded-2xl bg-[#0f2d5e] p-5 text-white flex flex-col gap-3">
            <p className="text-xs font-medium opacity-70">Saldo disponível para saque</p>
            <p className="text-3xl font-extrabold tabular-nums">
              {loading ? '—' : saldo != null ? formatBRL(saldo) : 'Indisponível'}
            </p>
            <button
              type="button"
              onClick={() => setShowSaque(true)}
              disabled={saldo == null}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#0f2d5e] text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors w-fit disabled:opacity-50"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Sacar agora
            </button>
          </div>

          {/* Col 2: a liberar */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Em processamento</p>
              <p className="text-3xl font-extrabold tabular-nums text-[#d97706]">{loading ? '—' : formatBRL(emProcessamento)}</p>
            </div>
            <p className="text-xs text-[#9ca3af] mt-3">Transferências Pix em andamento na Asaas</p>
          </div>

          {/* Col 3: total sacado */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Total já sacado</p>
              <p className="text-3xl font-extrabold tabular-nums text-[#0f2d5e]">{loading ? '—' : formatBRL(totalSacado)}</p>
            </div>
            <p className="text-xs text-[#9ca3af] mt-3">Soma dos saques concluídos</p>
          </div>
        </div>

        {/* Extrato — histórico real de saques */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#0f2d5e]">Extrato de saques</h3>
          </div>
          {loading ? (
            <p className="px-5 py-6 text-sm text-[#9ca3af]">Carregando...</p>
          ) : saques.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[#9ca3af]">Nenhum saque solicitado ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-gray-50">
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Data</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Chave Pix</th>
                  <th className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Valor</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Status</th>
                </tr>
              </thead>
              <tbody>
                {saques.map((item) => {
                  const config = STATUS_SAQUE_CONFIG[item.status] ?? { label: item.status, bg: '#f3f4f6', color: '#4b5563' };
                  return (
                    <tr key={item.id} className="border-b border-[#f1f5f9]">
                      <td className="px-5 py-3.5 text-[#9ca3af] shrink-0 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3.5 text-[#374151]">{item.pixAddressKey}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap text-[#dc2626]">
                        -{formatBRL(Number(item.valor))}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: config.bg, color: config.color }}
                        >
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
