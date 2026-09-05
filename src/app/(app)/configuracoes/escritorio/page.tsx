'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type Papel = 'Sócio' | 'Associado' | 'Estagiário';

interface Membro {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  entrada: string;
  isSelf: boolean;
}

const MEMBROS_INICIAIS: Membro[] = [
  { id: '1', nome: 'Cleberson Bezerra', email: 'cleberson@escritorio.com.br', papel: 'Sócio', entrada: '12/01/2024', isSelf: true },
  { id: '2', nome: 'Ana Ferreira', email: 'ana@escritorio.com.br', papel: 'Associado', entrada: '03/06/2024', isSelf: false },
  { id: '3', nome: 'Marina Costa', email: 'marina@escritorio.com.br', papel: 'Associado', entrada: '18/11/2024', isSelf: false },
  { id: '4', nome: 'Pedro Lima', email: 'pedro@escritorio.com.br', papel: 'Estagiário', entrada: '02/02/2026', isSelf: false },
];

function ConvidarModal({ onClose, onConvidar }: {
  onClose: () => void;
  onConvidar: (email: string, papel: Papel) => void;
}) {
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<Papel>('Associado');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onConvidar(email.trim(), papel);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Convidar advogado
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="advogado@escritorio.com.br"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as Papel)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            >
              <option>Sócio</option>
              <option>Associado</option>
              <option>Estagiário</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-lg hover:bg-[#1a3f7a] transition-colors"
            >
              Enviar convite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EscritorioPage() {
  const [membros, setMembros] = useState<Membro[]>(MEMBROS_INICIAIS);
  const [showConvidar, setShowConvidar] = useState(false);

  function handleChangePapel(id: string, papel: Papel) {
    setMembros((prev) => prev.map((m) => (m.id === id ? { ...m, papel } : m)));
  }

  function handleRemover(id: string) {
    if (!window.confirm('Tem certeza que deseja remover este membro?')) return;
    setMembros((prev) => prev.filter((m) => m.id !== id));
  }

  function handleConvidar(email: string, papel: Papel) {
    const nome = email.split('@')[0];
    setMembros((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        nome: nome.charAt(0).toUpperCase() + nome.slice(1),
        email,
        papel,
        entrada: new Date().toLocaleDateString('pt-BR'),
        isSelf: false,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-6">
      {showConvidar && (
        <ConvidarModal
          onClose={() => setShowConvidar(false)}
          onConvidar={handleConvidar}
        />
      )}

      <div>
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Equipe & Plano
        </h1>
        <p className="mt-1 text-sm text-[#64748b]">Gerencie os membros do escritório e o plano contratado.</p>
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">

        {/* Coluna esquerda — Equipe */}
        <div className="bg-white border border-[#e2e8f0] rounded-[14px] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#e2e8f0]">
            <h2 className="text-sm font-bold text-[#0f2d5e]">Equipe ({membros.length})</h2>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Nome</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">E-mail</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Papel</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Entrada</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => (
                <tr key={m.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1e293b]">{m.nome}</span>
                      {m.isSelf && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#f3e8ff] text-[#7c3aed]">
                          você
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#64748b] text-xs">{m.email}</td>
                  <td className="px-5 py-3.5">
                    <select
                      value={m.papel}
                      onChange={(e) => handleChangePapel(m.id, e.target.value as Papel)}
                      disabled={m.isSelf}
                      className="px-2 py-1 border border-[#e2e8f0] rounded-lg text-xs text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 disabled:opacity-60 disabled:cursor-default"
                    >
                      <option>Sócio</option>
                      <option>Associado</option>
                      <option>Estagiário</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-[#94a3b8] text-xs whitespace-nowrap">{m.entrada}</td>
                  <td className="px-5 py-3.5">
                    {!m.isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemover(m.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Botão convidar na base */}
          <div className="px-5 py-4 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setShowConvidar(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Convidar advogado
            </button>
          </div>
        </div>

        {/* Coluna direita — Plano atual */}
        <div className="bg-white border border-[#e2e8f0] rounded-[14px] p-5 shadow-sm flex flex-col gap-4">
          <h2 className="text-sm font-bold text-[#0f2d5e]">Plano atual</h2>
          <div className="space-y-2">
            <p className="text-xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Profissional
            </p>
            <p className="text-sm text-[#64748b]">Até 150 processos monitorados</p>
            <p className="text-sm text-[#64748b]">Renova em <span className="font-semibold text-[#1e293b]">10/09/2026</span></p>
          </div>
          <button
            type="button"
            className="w-full py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors"
          >
            Gerenciar plano
          </button>
        </div>
      </div>
    </div>
  );
}
