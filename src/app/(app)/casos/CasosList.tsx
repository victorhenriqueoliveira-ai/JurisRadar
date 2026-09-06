'use client';

import { useState } from 'react';
import { FolderOpen, Plus, X } from 'lucide-react';

interface CasoRow {
  id: string;
  titulo: string;
  clienteNome: string | null;
  responsavelNome: string | null;
  status: string;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; checkColor: string }> = {
  ativo:     { bg: '#eff6ff', color: '#1d4ed8', checkColor: '#1d4ed8' },
  concluido: { bg: '#f1f5f9', color: '#475569', checkColor: '#475569' },
  pausado:   { bg: '#fef3c7', color: '#92400e', checkColor: '#d97706' },
};

function statusLabel(s: string) {
  const map: Record<string, string> = { ativo: 'Ativo', concluido: 'Concluído', pausado: 'Pausado' };
  return map[s] ?? s;
}

function NovoCasoModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (titulo: string) => void;
}) {
  const [titulo, setTitulo] = useState('');
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onSave(titulo.trim());
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Novo caso / investigação</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input autoFocus type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Investigação — Fraude contratual" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-lg hover:bg-[#1a3f7a]">Criar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CasosList({ initialData }: { initialData: CasoRow[] }) {
  const [casos, setCasos] = useState<CasoRow[]>(initialData);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function addCaso(titulo: string) {
    const res = await fetch('/api/casos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo }),
    });
    if (res.ok) {
      const created = await res.json() as CasoRow;
      setCasos((prev) => [{ ...created, clienteNome: null, responsavelNome: null }, ...prev]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {showModal && <NovoCasoModal onClose={() => setShowModal(false)} onSave={addCaso} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Casos / Investigações</h1>
          <p className="mt-1 text-sm text-[#64748b]">Gerencie casos complexos e investigações em curso</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size >= 2 && (
            <button type="button" className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] text-white text-sm font-semibold rounded-xl hover:bg-[#6d28d9] transition-colors">
              <FolderOpen className="w-4 h-4" />
              Agrupar casos ({selected.size})
            </button>
          )}
          <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors">
            <Plus className="w-4 h-4" />
            Novo caso
          </button>
        </div>
      </div>

      {casos.length === 0 ? (
        <div className="text-center py-16 text-sm text-[#94a3b8]">Nenhum caso cadastrado. Crie o primeiro pelo botão acima.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {casos.map((caso) => {
            const cfg = STATUS_CONFIG[caso.status] ?? STATUS_CONFIG['ativo'];
            const isSelected = selected.has(caso.id);
            return (
              <div
                key={caso.id}
                onClick={() => toggle(caso.id)}
                className="relative bg-white border rounded-[14px] p-4 shadow-sm cursor-pointer transition-all"
                style={{
                  borderColor: isSelected ? '#0f2d5e' : '#e2e8f0',
                  background: isSelected ? '#f0f4ff' : '#ffffff',
                  boxShadow: isSelected ? '0 0 0 2px rgba(15,45,94,0.15)' : undefined,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0 flex items-center justify-center" style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${cfg.checkColor}`, background: isSelected ? cfg.checkColor : 'transparent' }}>
                    {isSelected && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </div>
                  <h3 className="flex-1 text-[15px] font-bold text-[#1e293b] leading-snug">{caso.titulo}</h3>
                  <span className="shrink-0 ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{statusLabel(caso.status)}</span>
                </div>
                <div className="mt-3 space-y-1 pl-[22px]">
                  <p className="text-[13px] text-[#64748b]"><span className="text-[#94a3b8]">Cliente:</span> {caso.clienteNome ?? '—'}</p>
                  <p className="text-[13px] text-[#64748b]"><span className="text-[#94a3b8]">Responsável:</span> {caso.responsavelNome ?? '—'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected.size === 1 && (
        <p className="text-xs text-[#94a3b8] text-center">Selecione 2 ou mais casos para agrupá-los.</p>
      )}
    </div>
  );
}
