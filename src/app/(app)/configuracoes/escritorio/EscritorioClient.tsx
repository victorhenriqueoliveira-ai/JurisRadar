'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type Papel = 'socio' | 'associado' | 'estagiario';

interface MembroRow {
  id: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  role: string;
  isSelf: boolean;
  createdAt: Date | null;
}

interface PlanoRow {
  status: string;
  plan: string;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
}

const PAPEL_LABEL: Record<string, string> = {
  socio: 'Sócio',
  associado: 'Associado',
  estagiario: 'Estagiário',
};

function formatDate(d: Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function ConvidarModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (email: string, role: Papel) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Papel>('associado');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onSave(email.trim(), role);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Convidar advogado</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input autoFocus type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="advogado@escritorio.com.br" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Papel)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30">
              <option value="socio">Sócio</option>
              <option value="associado">Associado</option>
              <option value="estagiario">Estagiário</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-lg hover:bg-[#1a3f7a]">Enviar convite</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EscritorioClient({ equipe: initialEquipe, plano }: {
  equipe: MembroRow[];
  plano: PlanoRow | null;
}) {
  const [equipe, setEquipe] = useState<MembroRow[]>(initialEquipe);
  const [showConvite, setShowConvite] = useState(false);
  const [papeis, setPapeis] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialEquipe.map((m) => [m.id, m.role]))
  );

  async function convidar(email: string, role: Papel) {
    const res = await fetch('/api/escritorio/equipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro ao convidar' }));
      alert(err.error ?? 'Erro ao convidar');
    }
  }

  async function remover(id: string) {
    const res = await fetch(`/api/escritorio/equipe/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setEquipe((prev) => prev.filter((m) => m.id !== id));
    }
  }

  function formatPlanName(plan: string) {
    const map: Record<string, string> = { professional: 'Profissional', starter: 'Starter', enterprise: 'Enterprise', trialing: 'Trial' };
    return map[plan] ?? plan;
  }

  return (
    <div className="flex flex-col gap-6">
      {showConvite && <ConvidarModal onClose={() => setShowConvite(false)} onSave={convidar} />}

      <div>
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Equipe & Plano</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Gerencie os membros do escritório e o plano atual.</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Coluna equipe */}
        <div className="flex-[1.4] min-w-0 bg-white border border-[#e2e8f0] rounded-[14px] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#e2e8f0]">
            <h2 className="text-sm font-bold text-[#1e293b]" style={{ fontFamily: 'Manrope, sans-serif' }}>Equipe</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-gray-50">
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Nome</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">E-mail</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Papel</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipe.map((m) => (
                <tr key={m.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0f2d5e]/10 flex items-center justify-center text-xs font-bold text-[#0f2d5e]">
                        {(m.name ?? m.email ?? '?')[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-[#1e293b]">{m.name ?? '—'}</span>
                      {m.isSelf && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">você</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#6b7280]">{m.email ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={papeis[m.id] ?? m.role}
                      onChange={(e) => setPapeis((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      disabled={m.isSelf}
                      className="px-2 py-1 border border-gray-200 rounded-lg text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="socio">Sócio</option>
                      <option value="associado">Associado</option>
                      <option value="estagiario">Estagiário</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    {!m.isSelf && (
                      <button type="button" onClick={() => remover(m.id)} className="px-3 py-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-4 border-t border-[#e2e8f0]">
            <button type="button" onClick={() => setShowConvite(true)} className="flex items-center gap-2 px-4 py-2 border border-[#0f2d5e] text-[#0f2d5e] text-sm font-semibold rounded-xl hover:bg-[#0f2d5e]/5 transition-colors">
              <Plus className="w-4 h-4" /> Convidar advogado
            </button>
          </div>
        </div>

        {/* Coluna plano */}
        <div className="flex-1 bg-white border border-[#e2e8f0] rounded-[14px] p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#1e293b] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Plano atual</h2>
          {plano ? (
            <div className="space-y-3">
              <p className="text-xl font-extrabold text-[#0f2d5e]">{formatPlanName(plano.plan)}</p>
              <p className="text-sm text-[#6b7280]">Até 150 processos monitorados</p>
              {plano.currentPeriodEnd && (
                <p className="text-sm text-[#6b7280]">Renova em {formatDate(plano.currentPeriodEnd)}</p>
              )}
              {plano.trialEndsAt && (
                <p className="text-sm text-amber-600 font-medium">Trial até {formatDate(plano.trialEndsAt)}</p>
              )}
              <div className="pt-2">
                <button type="button" className="w-full py-2.5 px-4 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors">
                  Gerenciar plano
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xl font-extrabold text-[#0f2d5e]">Profissional</p>
              <p className="text-sm text-[#6b7280]">Até 150 processos monitorados</p>
              <div className="pt-2">
                <button type="button" className="w-full py-2.5 px-4 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors">
                  Gerenciar plano
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
