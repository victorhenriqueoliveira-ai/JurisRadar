'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Search, Activity, RefreshCw, CheckCircle, XCircle, Clock, KeyRound, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface ClienteDetail {
  org: {
    id: string;
    name: string;
    slug: string;
    cnpj: string | null;
    createdAt: string;
    onboardingCompletedAt: string | null;
  };
  sub: {
    status: string;
    plan: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
  } | null;
  membros: {
    id: string;
    role: string;
    userId: string;
    name: string | null;
    email: string;
    oabNumero: string | null;
    oabEstado: string | null;
    createdAt: string;
  }[];
  stats: { totalProcessos: number; totalBuscas: number };
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-yellow-100 text-yellow-700',
  past_due: 'bg-red-100 text-red-600',
  canceled: 'bg-gray-100 text-gray-500',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo', trialing: 'Trial', past_due: 'Em atraso', canceled: 'Cancelado',
};

export default function ClienteDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<ClienteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Formulários de ação
  const [trialDate, setTrialDate] = useState('');
  const [newPlan, setNewPlan] = useState('monthly');
  const [newStatus, setNewStatus] = useState('active');

  // Reset de senha
  const [resetSenhaUserId, setResetSenhaUserId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  async function excluirCliente() {
    if (!confirm(`Excluir permanentemente "${data?.org.name}"?\n\nIsso apagará todos os processos, buscas, membros e dados da organização. Esta ação é irreversível.`)) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/admin/clientes/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) { setFeedback(d.error ?? 'Erro ao excluir.'); setExcluindo(false); return; }
      router.push('/admin/clientes');
    } catch {
      setFeedback('Erro ao excluir cliente.');
      setExcluindo(false);
    }
  }

  async function resetarSenha(userId: string) {
    if (!novaSenha || novaSenha.length < 8) {
      setFeedback('A nova senha deve ter ao menos 8 caracteres.');
      return;
    }
    setSalvandoSenha(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}/senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha }),
      });
      const d = await res.json();
      if (!res.ok) { setFeedback(d.error ?? 'Erro ao redefinir senha.'); return; }
      setFeedback(`Senha de ${d.email} redefinida com sucesso.`);
      setResetSenhaUserId(null);
      setNovaSenha('');
    } catch {
      setFeedback('Erro ao redefinir senha.');
    } finally {
      setSalvandoSenha(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clientes/${id}`);
      const d = await res.json();
      setData(d);
      if (d.sub?.trialEndsAt) {
        setTrialDate(d.sub.trialEndsAt.slice(0, 10));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function action(payload: Record<string, unknown>) {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/clientes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) { setFeedback(d.error ?? 'Erro.'); return; }
      setFeedback('Alteração salva com sucesso.');
      await load();
    } catch {
      setFeedback('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse" />
        <div className="mt-6 grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-red-600">Organização não encontrada.</div>;
  }

  const { org, sub, membros, stats } = data;
  const status = sub?.status ?? 'sem_assinatura';

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/clientes" className="p-1.5 rounded-lg border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors">
          <ArrowLeft className="w-4 h-4 text-[#374151]" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {org.name}
          </h1>
          <p className="text-sm text-[#9ca3af]">slug: {org.slug} · criado em {fmt(org.createdAt)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
          <button
            type="button"
            disabled={excluindo}
            onClick={excluirCliente}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {excluindo ? 'Excluindo…' : 'Excluir cliente'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${feedback.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Stats */}
        {[
          { label: 'Processos', value: stats.totalProcessos, icon: Activity, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Buscas', value: stats.totalBuscas, icon: Search, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Membros', value: membros.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>{value}</p>
              <p className="text-xs text-[#9ca3af]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Assinatura */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#111827] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Assinatura</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[#9ca3af]">Status</dt><dd className="font-medium">{STATUS_LABELS[status] ?? status}</dd></div>
            <div className="flex justify-between"><dt className="text-[#9ca3af]">Plano</dt><dd className="font-medium capitalize">{sub?.plan ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-[#9ca3af]">Trial até</dt><dd className="font-medium">{fmt(sub?.trialEndsAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-[#9ca3af]">Período atual</dt><dd className="font-medium">{fmt(sub?.currentPeriodEnd)}</dd></div>
            <div className="flex justify-between"><dt className="text-[#9ca3af]">Stripe Customer</dt><dd className="font-mono text-xs truncate max-w-[160px]">{sub?.stripeCustomerId ?? '—'}</dd></div>
          </dl>
        </div>

        {/* Ações */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>Ações</h2>

          {/* Estender trial */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6b7280]">Estender trial até</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-[#e5e7eb] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
              />
              <button
                type="button"
                disabled={!trialDate || saving}
                onClick={() => action({ action: 'extend_trial', trialEndsAt: trialDate })}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0f2d5e] text-white text-xs font-semibold rounded-xl hover:bg-[#1a4a8a] disabled:opacity-50 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                Salvar
              </button>
            </div>
          </div>

          {/* Definir plano */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6b7280]">Alterar plano</label>
            <div className="flex gap-2">
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="flex-1 px-3 py-2 border border-[#e5e7eb] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
              >
                <option value="monthly">Mensal (R$157)</option>
                <option value="annual">Anual (R$127/mês)</option>
                <option value="trial">Trial</option>
              </select>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="px-3 py-2 border border-[#e5e7eb] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
              >
                <option value="active">Ativo</option>
                <option value="trialing">Trial</option>
                <option value="canceled">Cancelado</option>
                <option value="past_due">Em atraso</option>
              </select>
              <button
                type="button"
                disabled={saving}
                onClick={() => action({ action: 'set_plan', plan: newPlan, status: newStatus })}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0f2d5e] text-white text-xs font-semibold rounded-xl hover:bg-[#1a4a8a] disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                OK
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => action({ action: 'activate' })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Ativar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (!confirm('Cancelar assinatura deste cliente?')) return;
                action({ action: 'cancel' });
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* Membros */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f3f4f6]">
          <h2 className="text-sm font-bold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>Membros ({membros.length})</h2>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">E-mail</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">OAB</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Papel</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <>
                <tr key={m.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                  <td className="px-4 py-3 font-medium text-[#111827]">{m.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{m.email}</td>
                  <td className="px-4 py-3 text-[#6b7280]">
                    {m.oabNumero ? `${m.oabEstado} ${m.oabNumero}` : '—'}
                  </td>
                  <td className="px-4 py-3 capitalize text-[#374151]">{m.role}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => { setResetSenhaUserId(resetSenhaUserId === m.userId ? null : m.userId); setNovaSenha(''); }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#6b7280] border border-[#e5e7eb] rounded-lg hover:bg-[#f3f4f6] transition-colors"
                    >
                      <KeyRound className="w-3 h-3" />
                      Senha
                    </button>
                  </td>
                </tr>
                {resetSenhaUserId === m.userId && (
                  <tr key={`${m.id}-senha`} className="bg-[#fafafa] border-b border-[#f3f4f6]">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="Nova senha (mín. 8 caracteres)"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20"
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={salvandoSenha || novaSenha.length < 8}
                          onClick={() => resetarSenha(m.userId)}
                          className="px-3 py-1.5 bg-[#0f2d5e] text-white text-xs font-semibold rounded-lg hover:bg-[#1a4a8a] disabled:opacity-50 transition-colors"
                        >
                          {salvandoSenha ? 'Salvando…' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setResetSenhaUserId(null); setNovaSenha(''); }}
                          className="px-3 py-1.5 text-xs text-[#9ca3af] hover:text-[#374151] transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
