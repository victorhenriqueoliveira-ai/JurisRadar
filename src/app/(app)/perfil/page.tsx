'use client';

import { useState } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';

type PerfilTab = 'dados' | 'seguranca' | 'notificacoes' | 'indicacoes';

const TABS: { id: PerfilTab; label: string }[] = [
  { id: 'dados', label: 'Dados pessoais' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'indicacoes', label: 'Indicações' },
];

function DadosPessoais() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [oab, setOab] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
          ✓ Dados salvos com sucesso!
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">OAB</label>
        <input
          type="text"
          value={oab}
          onChange={(e) => setOab(e.target.value)}
          placeholder="SP 123456"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors"
      >
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
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
          ✓ Senha alterada com sucesso!
        </div>
      )}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
        <div className="relative">
          <input
            type={showAtual ? 'text' : 'password'}
            required
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
          />
          <button
            type="button"
            onClick={() => setShowAtual((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
        <div className="relative">
          <input
            type={showNova ? 'text' : 'password'}
            required
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
          />
          <button
            type="button"
            onClick={() => setShowNova((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors"
      >
        {saving ? 'Alterando…' : 'Alterar senha'}
      </button>
    </form>
  );
}

function ToggleSwitch({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-[#f1f5f9] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#1e293b]">{label}</p>
        <p className="text-xs text-[#94a3b8] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#0f2d5e]' : 'bg-gray-200'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

function Notificacoes() {
  const [prefs, setPrefs] = useState({
    email: true,
    whatsapp: false,
    prazos: true,
    novidades: false,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  const NOTIF = [
    { key: 'email' as const, label: 'Notificações por e-mail', description: 'Receba alertas e relatórios no seu e-mail' },
    { key: 'whatsapp' as const, label: 'Notificações via WhatsApp', description: 'Alertas instantâneos pelo WhatsApp' },
    { key: 'prazos' as const, label: 'Alertas de prazos críticos', description: 'Avise quando um prazo fatal estiver próximo' },
    { key: 'novidades' as const, label: 'Novidades do JurisRadar', description: 'Fique por dentro de novas funcionalidades' },
  ];

  return (
    <div className="max-w-md">
      {NOTIF.map((n) => (
        <ToggleSwitch
          key={n.key}
          checked={prefs[n.key]}
          onChange={() => toggle(n.key)}
          label={n.label}
          description={n.description}
        />
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
    <div className="max-w-md space-y-5">
      {/* Link de indicação */}
      <div className="bg-white border border-[#e2e8f0] rounded-[14px] p-5">
        <h3 className="text-sm font-bold text-[#0f2d5e] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Seu link de indicação
        </h3>
        <p className="text-xs text-[#64748b] mb-4">
          Compartilhe este link e ganhe benefícios quando seu convidado assinar.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#374151] font-mono truncate">
            {link}
          </div>
          <button
            type="button"
            onClick={copyLink}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors shrink-0 ${
              copied ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#0f2d5e] text-white hover:bg-[#1a3f7a]'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Indicações */}
      <div className="bg-white border border-[#e2e8f0] rounded-[14px] p-5">
        <h3 className="text-sm font-bold text-[#0f2d5e] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Pessoas indicadas: 0
        </h3>
        <p className="text-sm text-[#94a3b8] text-center py-6 border border-dashed border-[#e2e8f0] rounded-xl">
          Nenhuma indicação ainda.
        </p>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const [activeTab, setActiveTab] = useState<PerfilTab>('dados');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Meu perfil
        </h1>
        <p className="mt-1 text-sm text-[#64748b]">Gerencie seus dados, senha e preferências</p>
      </div>

      {/* Layout com sidebar vertical de tabs à esquerda */}
      <div className="flex gap-6 items-start">
        {/* Sidebar de tabs */}
        <div className="shrink-0 w-[180px] flex flex-col gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="w-full text-left rounded-lg transition-colors"
              style={{
                padding: '9px 12px',
                background: activeTab === tab.id ? '#f1f5f9' : 'transparent',
                color: activeTab === tab.id ? '#0f2d5e' : '#64748b',
                fontWeight: activeTab === tab.id ? 600 : 400,
                fontSize: '0.875rem',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 bg-white border border-[#e2e8f0] rounded-[14px] p-6 shadow-sm">
          {activeTab === 'dados' && <DadosPessoais />}
          {activeTab === 'seguranca' && <Seguranca />}
          {activeTab === 'notificacoes' && <Notificacoes />}
          {activeTab === 'indicacoes' && <Indicacoes />}
        </div>
      </div>
    </div>
  );
}
