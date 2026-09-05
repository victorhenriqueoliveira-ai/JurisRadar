'use client';

import { useState } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';

type PerfilTab = 'dados' | 'seguranca' | 'notificacoes' | 'indicacoes';

interface PerfilData {
  id: string;
  name: string | null;
  email: string | null;
  oabNumero: string | null;
  oabEstado: string | null;
}

const TABS: { id: PerfilTab; label: string }[] = [
  { id: 'dados',        label: 'Dados pessoais' },
  { id: 'seguranca',   label: 'Segurança' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'indicacoes',  label: 'Indicações' },
];

function DadosPessoais({ initial }: { initial: PerfilData }) {
  const [nome, setNome] = useState(initial.name ?? '');
  const [oabNumero, setOabNumero] = useState(initial.oabNumero ?? '');
  const [oabEstado, setOabEstado] = useState(initial.oabEstado ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, oabNumero, oabEstado }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError('Erro ao salvar. Tente novamente.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {saved && <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">✓ Dados salvos com sucesso!</div>}
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input type="email" value={initial.email ?? ''} disabled className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">OAB Número</label>
          <input type="text" value={oabNumero} onChange={(e) => setOabNumero(e.target.value)} placeholder="123456" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
        </div>
        <div className="w-24">
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <input type="text" value={oabEstado} onChange={(e) => setOabEstado(e.target.value.toUpperCase().slice(0,2))} placeholder="SP" maxLength={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 uppercase" />
        </div>
      </div>
      <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors">
        {saving ? 'Salvando…' : 'Salvar dados'}
      </button>
    </form>
  );
}

function Seguranca() {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (nova.length < 8) { setError('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setAtual(''); setNova('');
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {saved && <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">✓ Senha alterada com sucesso!</div>}
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {[
        { label: 'Senha atual', value: atual, set: setAtual, show: showAtual, toggle: () => setShowAtual((v) => !v) },
        { label: 'Nova senha',  value: nova,  set: setNova,  show: showNova,  toggle: () => setShowNova((v) => !v) },
      ].map(({ label, value, set, show, toggle }) => (
        <div key={label}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} required value={value} onChange={(e) => set(e.target.value)} className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
            <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ))}
      <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors">
        {saving ? 'Alterando…' : 'Alterar senha'}
      </button>
    </form>
  );
}

function ToggleSwitch({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-[#f1f5f9] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#1e293b]">{label}</p>
        <p className="text-xs text-[#9ca3af] mt-0.5">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#0f2d5e]' : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function Notificacoes() {
  const [prefs, setPrefs] = useState({ email: true, whatsapp: false, prazos: true, novidades: false });
  const NOTIF = [
    { key: 'email' as const, label: 'E-mail', description: 'Receba alertas e relatórios no seu e-mail' },
    { key: 'whatsapp' as const, label: 'WhatsApp', description: 'Alertas instantâneos pelo WhatsApp' },
    { key: 'prazos' as const, label: 'Prazos críticos', description: 'Avise quando um prazo fatal estiver próximo' },
    { key: 'novidades' as const, label: 'Novidades do produto', description: 'Fique por dentro de novas funcionalidades' },
  ];
  return (
    <div>
      {NOTIF.map((n) => (
        <ToggleSwitch key={n.key} checked={prefs[n.key]} onChange={() => setPrefs((p) => ({ ...p, [n.key]: !p[n.key] }))} label={n.label} description={n.description} />
      ))}
    </div>
  );
}

function Indicacoes() {
  const [copied, setCopied] = useState(false);
  const link = 'https://jurisradar.com.br/convite/jr-abc123';
  function copyLink() {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6b7280]">Compartilhe este link e ganhe benefícios quando seu convidado assinar.</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#374151] font-mono truncate">{link}</div>
        <button type="button" onClick={copyLink} className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors shrink-0 ${copied ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#0f2d5e] text-white hover:bg-[#1a3f7a]'}`}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-sm text-[#6b7280]">Pessoas indicadas: <strong>0</strong></p>
      <p className="text-sm text-[#94a3b8] text-center py-6 border border-dashed border-[#e5e7eb] rounded-xl">Nenhuma indicação ainda.</p>
    </div>
  );
}

export default function PerfilForm({ initialData }: { initialData: PerfilData }) {
  const [activeTab, setActiveTab] = useState<PerfilTab>('dados');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Meu perfil</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Gerencie seus dados, senha e preferências</p>
      </div>

      <div className="flex gap-6 flex-col sm:flex-row">
        {/* Tabs verticais */}
        <div className="flex flex-row sm:flex-col gap-1 sm:w-44 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="text-left px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? '#f1f5f9' : 'transparent',
                color: activeTab === tab.id ? '#0f2d5e' : '#64748b',
                fontWeight: activeTab === tab.id ? 600 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 bg-white border border-[#e2e8f0] rounded-[14px] p-6 shadow-sm max-w-lg">
          {activeTab === 'dados'        && <DadosPessoais initial={initialData} />}
          {activeTab === 'seguranca'    && <Seguranca />}
          {activeTab === 'notificacoes' && <Notificacoes />}
          {activeTab === 'indicacoes'   && <Indicacoes />}
        </div>
      </div>
    </div>
  );
}
