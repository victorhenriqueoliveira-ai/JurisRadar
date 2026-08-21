'use client';

import { useState, useEffect } from 'react';
import { User, Building2, Bell, CreditCard, ChevronRight, Check, Loader2 } from 'lucide-react';

type Aba = 'perfil' | 'notificacoes' | 'assinatura';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-[.04em] text-[#9ca3af] mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 border border-[#e5e7eb] rounded-xl text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 focus:border-[#0f2d5e] transition-colors placeholder-[#9ca3af] disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#f3f4f6] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#374151]">{label}</p>
        {description && <p className="text-xs text-[#9ca3af] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-[#0f2d5e]' : 'bg-[#e5e7eb]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SaveButton({ onClick, saved, loading }: { onClick: () => void; saved: boolean; loading?: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
          saved ? 'bg-green-600 text-white' : 'bg-[#0f2d5e] text-white hover:bg-[#1a4a8a]'
        }`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
        {loading ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
      </button>
    </div>
  );
}

// ── Aba Perfil ────────────────────────────────────────────────────────────────

function PerfilTab() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [fields, setFields] = useState({
    name: '',
    email: '',
    cpf: '',
    oabEstado: '',
    oabNumero: '',
    senhaAtual: '',
    novaSenha: '',
  });

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => {
        setFields((f) => ({
          ...f,
          name: data.name ?? '',
          email: data.email ?? '',
          cpf: data.cpf ?? '',
          oabEstado: data.oabEstado ?? '',
          oabNumero: data.oabNumero ?? '',
        }));
      })
      .catch(() => setErro('Não foi possível carregar o perfil.'))
      .finally(() => setLoading(false));
  }, []);

  function set(field: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [field]: e.target.value }));
  }

  async function save() {
    setErro(null);
    setSaving(true);
    try {
      const body: Record<string, string> = {
        name: fields.name,
        cpf: fields.cpf,
        oabNumero: fields.oabNumero,
        oabEstado: fields.oabEstado,
      };
      if (fields.novaSenha) {
        body.senhaAtual = fields.senhaAtual;
        body.novaSenha = fields.novaSenha;
      }

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao salvar.');
        return;
      }
      setSaved(true);
      setFields((f) => ({ ...f, senhaAtual: '', novaSenha: '' }));
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setErro('Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-[15px] font-bold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>Perfil</h2>

      {erro && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{erro}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FieldLabel>Nome completo</FieldLabel>
          <Input value={fields.name} onChange={set('name')} placeholder="Seu nome" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>E-mail</FieldLabel>
          <Input type="email" value={fields.email} disabled placeholder="seu@email.com" />
        </div>
        <div>
          <FieldLabel>CPF</FieldLabel>
          <Input value={fields.cpf} onChange={set('cpf')} placeholder="000.000.000-00" />
        </div>
        <div>
          <FieldLabel>OAB</FieldLabel>
          <div className="flex gap-2">
            <select
              value={fields.oabEstado}
              onChange={set('oabEstado')}
              className="w-20 px-2 py-2.5 border border-[#e5e7eb] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 focus:border-[#0f2d5e]"
            >
              <option value="">UF</option>
              {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            <Input value={fields.oabNumero} onChange={set('oabNumero')} placeholder="123456" />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[#f3f4f6]">
        <p className="text-sm font-bold text-[#111827] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Alterar senha</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Senha atual</FieldLabel>
            <Input type="password" value={fields.senhaAtual} onChange={set('senhaAtual')} placeholder="••••••••" />
          </div>
          <div>
            <FieldLabel>Nova senha (mín. 8 caracteres)</FieldLabel>
            <Input type="password" value={fields.novaSenha} onChange={set('novaSenha')} placeholder="••••••••" />
          </div>
        </div>
      </div>

      <SaveButton onClick={save} saved={saved} loading={saving} />
    </div>
  );
}

// ── Aba Notificações ──────────────────────────────────────────────────────────

function NotificacoesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [prefs, setPrefs] = useState({
    emailIntimacoes: true,
    emailPrazos: true,
    emailResumo: false,
  });

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => {
        const np = data.notificationPrefs ?? {};
        const desativados: string[] = np.emailDesativado ?? [];
        setPrefs({
          emailIntimacoes: !desativados.includes('intimacao'),
          emailPrazos: !desativados.includes('prazo_vencendo'),
          emailResumo: !desativados.includes('resumo_diario'),
        });
      })
      .catch(() => setErro('Erro ao carregar preferências.'))
      .finally(() => setLoading(false));
  }, []);

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  async function save() {
    setErro(null);
    setSaving(true);
    try {
      const emailDesativado: string[] = [];
      if (!prefs.emailIntimacoes) emailDesativado.push('intimacao');
      if (!prefs.emailPrazos) emailDesativado.push('prazo_vencendo');
      if (!prefs.emailResumo) emailDesativado.push('resumo_diario');

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationPrefs: { emailDesativado } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao salvar.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setErro('Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="space-y-4 animate-pulse">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <h2 className="text-[15px] font-bold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>Notificações</h2>

      {erro && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{erro}</div>}

      <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-5">
        <p className="text-sm font-bold text-[#374151] mb-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>E-mail</p>
        <p className="text-xs text-[#9ca3af] mb-3">Configure quais alertas você quer receber por e-mail.</p>
        <Toggle
          checked={prefs.emailIntimacoes}
          onChange={() => toggle('emailIntimacoes')}
          label="Nova intimação recebida"
          description="Receba um e-mail imediatamente quando houver nova intimação."
        />
        <Toggle
          checked={prefs.emailPrazos}
          onChange={() => toggle('emailPrazos')}
          label="Prazo crítico (T-5, T-2, T-1 dias)"
          description="Alertas automáticos antes do vencimento."
        />
        <Toggle
          checked={prefs.emailResumo}
          onChange={() => toggle('emailResumo')}
          label="Resumo diário"
          description="Um e-mail por dia com as movimentações do dia."
        />
      </div>

      <SaveButton onClick={save} saved={saved} loading={saving} />
    </div>
  );
}

// ── Aba Assinatura ────────────────────────────────────────────────────────────

function AssinaturaTab() {
  const [loading, setLoading] = useState(false);

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/checkout?plan=${plan}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      alert('Erro ao abrir o portal. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-[15px] font-bold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>Assinatura</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-[18px] p-6 hover:border-[#0f2d5e]/30 transition-colors">
          <p className="text-sm font-bold text-[#374151]" style={{ fontFamily: 'Manrope, sans-serif' }}>Mensal</p>
          <div className="flex items-baseline gap-1 my-2">
            <span className="text-3xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>R$ 157</span>
            <span className="text-sm text-[#9ca3af]">/mês</span>
          </div>
          <p className="text-xs text-[#9ca3af] mb-5">Cobrado mensalmente. Cancele quando quiser.</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleCheckout('monthly')}
            className="w-full py-2.5 rounded-xl border-2 border-[#0f2d5e] text-[#0f2d5e] text-sm font-semibold hover:bg-[#0f2d5e] hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : 'Assinar mensal'}
          </button>
        </div>

        <div className="bg-[#0f2d5e] rounded-[18px] p-6 relative overflow-hidden">
          <span className="absolute top-4 right-4 px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#c9a84c] text-white">MELHOR VALOR</span>
          <p className="text-sm font-bold text-white/80" style={{ fontFamily: 'Manrope, sans-serif' }}>Anual</p>
          <div className="flex items-baseline gap-1 my-2">
            <span className="text-3xl font-extrabold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>R$ 127</span>
            <span className="text-sm text-white/60">/mês</span>
          </div>
          <p className="text-xs text-white/60 mb-5">Cobrado R$ 1.524/ano. Economia de R$ 360.</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleCheckout('annual')}
            className="w-full py-2.5 rounded-xl bg-[#c9a84c] text-white text-sm font-semibold hover:bg-[#b8973e] transition-colors disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : 'Assinar anual'}
          </button>
        </div>
      </div>

      <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-5">
        <p className="text-sm font-bold text-[#374151] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Portal de assinatura</p>
        <p className="text-xs text-[#9ca3af] mb-4">Gerencie sua assinatura, atualize o cartão ou cancele pelo portal do Stripe.</p>
        <button
          type="button"
          disabled={loading}
          onClick={handlePortal}
          className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#0f2d5e] text-sm font-semibold rounded-xl hover:bg-[#f3f4f6] transition-colors disabled:opacity-50"
        >
          {loading ? 'Abrindo...' : 'Acessar portal de assinatura →'}
        </button>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

const ABAS: { id: Aba; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'assinatura', label: 'Assinatura', icon: CreditCard },
];

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>('perfil');

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Configurações
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Gerencie seu perfil e assinatura.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-52 shrink-0">
          <div className="bg-white border border-[#e5e7eb] rounded-[18px] p-2 flex flex-row md:flex-col gap-1">
            {ABAS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAba(id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                  aba === id
                    ? 'bg-[#0f2d5e] text-white font-semibold'
                    : 'text-[#374151] hover:bg-[#f3f4f6]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:block flex-1">{label}</span>
                {aba === id && <ChevronRight className="w-3.5 h-3.5 ml-auto hidden md:block" />}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 bg-white border border-[#e5e7eb] rounded-[18px] p-6 shadow-sm">
          {aba === 'perfil' && <PerfilTab />}
          {aba === 'notificacoes' && <NotificacoesTab />}
          {aba === 'assinatura' && <AssinaturaTab />}
        </div>
      </div>
    </div>
  );
}
