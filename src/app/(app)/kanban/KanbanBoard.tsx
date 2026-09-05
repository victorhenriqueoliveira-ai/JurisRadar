'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type ColId = 'a_fazer' | 'em_andamento' | 'aguardando' | 'concluido';

interface DbCard {
  id: string;
  titulo: string;
  tag: string | null;
  prazo: string | null;
  prioridade: string;
  coluna: string;
}

interface UiCard {
  id: string;
  titulo: string;
  tag: string;
  prazo: string;
  prioridade: string;
  priColor: string;
  initials: string;
}

interface Column {
  id: ColId;
  label: string;
  dot: string;
  cards: UiCard[];
}

const PRI_CONFIG: Record<string, { color: string; label: string }> = {
  urgente: { color: '#dc2626', label: 'Urgente' },
  alta:    { color: '#d97706', label: 'Alta' },
  media:   { color: '#ca8a04', label: 'Média' },
  baixa:   { color: '#6b7280', label: 'Baixa' },
};

const COL_META: Record<ColId, { label: string; dot: string }> = {
  a_fazer:      { label: 'A fazer',       dot: '#94a3b8' },
  em_andamento: { label: 'Em andamento',  dot: '#2563eb' },
  aguardando:   { label: 'Aguardando',    dot: '#d97706' },
  concluido:    { label: 'Concluído',     dot: '#16a34a' },
};

function toUiCard(card: DbCard): UiCard {
  const pri = PRI_CONFIG[card.prioridade] ?? PRI_CONFIG['baixa'];
  const initials = card.titulo.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return {
    id: card.id,
    titulo: card.titulo,
    tag: card.tag ?? 'Geral',
    prazo: card.prazo ?? '—',
    prioridade: pri.label,
    priColor: pri.color,
    initials: initials || '?',
  };
}

function AddCardModal({ colLabel, onClose, onSave }: {
  colLabel: string;
  onClose: () => void;
  onSave: (card: { titulo: string; tag: string; prioridade: string; prazo: string }) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [tag, setTag] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [prazo, setPrazo] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onSave({ titulo: titulo.trim(), tag: tag.trim() || 'Geral', prioridade, prazo: prazo || '—' });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Adicionar cartão — {colLabel}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input autoFocus type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Descreva o cartão…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
              <input type="text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex: Prazo, Peça…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30">
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo (opcional)</label>
            <input type="text" value={prazo} onChange={(e) => setPrazo(e.target.value)} placeholder="Ex: 3d, Hoje, Amanhã…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-lg hover:bg-[#1a3f7a]">Adicionar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KanbanBoard({ initialData }: { initialData: Record<ColId, DbCard[]> }) {
  const [columns, setColumns] = useState<Column[]>(() =>
    (Object.keys(COL_META) as ColId[]).map((id) => ({
      id,
      ...COL_META[id],
      cards: (initialData[id] ?? []).map(toUiCard),
    }))
  );
  const [addingTo, setAddingTo] = useState<ColId | null>(null);

  async function addCard(colId: ColId, data: { titulo: string; tag: string; prioridade: string; prazo: string }) {
    const res = await fetch('/api/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, coluna: colId }),
    });
    if (res.ok) {
      const created = await res.json() as DbCard;
      const uiCard = toUiCard(created);
      setColumns((prev) => prev.map((col) => col.id === colId ? { ...col, cards: [...col.cards, uiCard] } : col));
    }
  }

  const addingCol = columns.find((c) => c.id === addingTo);

  return (
    <div className="flex flex-col gap-6 h-full">
      {addingTo && addingCol && (
        <AddCardModal colLabel={addingCol.label} onClose={() => setAddingTo(null)} onSave={(d) => addCard(addingTo, d)} />
      )}

      <div>
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Kanban</h1>
        <p className="mt-1 text-sm text-[#64748b]">Visualize e mova tarefas entre colunas</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {columns.map((col) => (
          <div key={col.id} className="flex flex-col gap-3 min-w-[260px] w-[260px] rounded-xl p-3 shrink-0" style={{ background: '#f1f5f9' }}>
            <div className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col.dot }} />
              <span className="text-sm font-bold text-[#1e293b]">{col.label}</span>
              <span className="ml-auto text-xs font-semibold text-[#9ca3af] bg-white rounded-full px-2 py-0.5">{col.cards.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {col.cards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl p-3 shadow-sm" style={{ borderLeft: `3px solid ${card.priColor}` }}>
                  <p className="text-[13px] font-semibold text-[#1e293b] leading-snug mb-2">{card.titulo}</p>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: '#f3e8ff', color: '#7c3aed' }}>{card.tag}</span>
                    <span className="text-[11px] text-[#94a3b8]">{card.prazo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center rounded-full text-white font-bold shrink-0" style={{ width: 22, height: 22, background: '#0f2d5e', fontSize: '9px' }}>{card.initials}</span>
                    <span className="text-[10.5px] font-semibold" style={{ color: card.priColor }}>{card.prioridade}</span>
                  </div>
                </div>
              ))}

              <button type="button" onClick={() => setAddingTo(col.id)} className="flex items-center gap-2 px-3 py-2 text-sm text-[#64748b] hover:text-[#0f2d5e] rounded-xl transition-colors" style={{ border: '1px dashed #cbd5e1' }}>
                <Plus className="w-4 h-4" />
                Adicionar cartão
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
