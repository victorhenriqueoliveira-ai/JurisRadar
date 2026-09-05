'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type ColId = 'a_fazer' | 'em_andamento' | 'aguardando' | 'concluido';

interface KanbanCard {
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
  cards: KanbanCard[];
}

const COLUMNS_INIT: Column[] = [
  {
    id: 'a_fazer',
    label: 'A fazer',
    dot: '#94a3b8',
    cards: [
      { id: '1', titulo: 'Levantar documentos — Caso Alfa', tag: 'Prazo', prazo: '2d', prioridade: 'Alta', priColor: '#d97706', initials: 'AF' },
      { id: '2', titulo: 'Agendar perícia', tag: 'Audiência', prazo: '5d', prioridade: 'Média', priColor: '#ca8a04', initials: 'CB' },
      { id: '3', titulo: 'Atualizar cadastro', tag: 'CRM', prazo: '7d', prioridade: 'Baixa', priColor: '#6b7280', initials: 'ML' },
    ],
  },
  {
    id: 'em_andamento',
    label: 'Em andamento',
    dot: '#2563eb',
    cards: [
      { id: '4', titulo: 'Redigir petição inicial', tag: 'Peça', prazo: '1d', prioridade: 'Urgente', priColor: '#dc2626', initials: 'CB' },
      { id: '5', titulo: 'Revisar contrato', tag: 'Consultoria', prazo: '4d', prioridade: 'Média', priColor: '#ca8a04', initials: 'AF' },
    ],
  },
  {
    id: 'aguardando',
    label: 'Aguardando',
    dot: '#d97706',
    cards: [
      { id: '6', titulo: 'Resposta do cliente', tag: 'Cliente', prazo: '—', prioridade: 'Baixa', priColor: '#6b7280', initials: 'MC' },
    ],
  },
  {
    id: 'concluido',
    label: 'Concluído',
    dot: '#16a34a',
    cards: [
      { id: '7', titulo: 'Protocolo enviado', tag: 'Peça', prazo: 'Feito', prioridade: 'Concluída', priColor: '#16a34a', initials: 'CB' },
      { id: '8', titulo: 'Audiência realizada', tag: 'Audiência', prazo: 'Feito', prioridade: 'Concluída', priColor: '#16a34a', initials: 'AF' },
    ],
  },
];

function AddCardModal({ colLabel, onClose, onSave }: {
  colLabel: string;
  onClose: () => void;
  onSave: (card: Omit<KanbanCard, 'id'>) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [tag, setTag] = useState('');
  const [prioridade, setPrioridade] = useState('Média');
  const [prazo, setPrazo] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    const priColors: Record<string, string> = {
      Urgente: '#dc2626', Alta: '#d97706', Média: '#ca8a04', Baixa: '#6b7280',
    };
    onSave({
      titulo: titulo.trim(),
      tag: tag.trim() || 'Geral',
      prazo: prazo || '—',
      prioridade,
      priColor: priColors[prioridade] ?? '#6b7280',
      initials: 'EU',
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Adicionar cartão — {colLabel}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              autoFocus
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Descreva o cartão…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ex: Prazo, Peça…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
              >
                <option>Urgente</option>
                <option>Alta</option>
                <option>Média</option>
                <option>Baixa</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo (opcional)</label>
            <input
              type="text"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              placeholder="Ex: 3d, Hoje, Amanhã…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-lg hover:bg-[#1a3f7a] transition-colors">
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const [columns, setColumns] = useState<Column[]>(COLUMNS_INIT);
  const [addingTo, setAddingTo] = useState<ColId | null>(null);

  function addCard(colId: ColId, card: Omit<KanbanCard, 'id'>) {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === colId
          ? { ...col, cards: [...col.cards, { ...card, id: String(Date.now()) }] }
          : col
      )
    );
  }

  function removeCard(colId: ColId, cardId: string) {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === colId ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) } : col
      )
    );
  }

  const addingCol = columns.find((c) => c.id === addingTo);

  return (
    <div className="flex flex-col gap-6 h-full">
      {addingTo && addingCol && (
        <AddCardModal
          colLabel={addingCol.label}
          onClose={() => setAddingTo(null)}
          onSave={(card) => addCard(addingTo, card)}
        />
      )}

      <div>
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Kanban
        </h1>
        <p className="mt-1 text-sm text-[#64748b]">Visualize e mova tarefas entre colunas</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex flex-col gap-3 min-w-[260px] w-[260px] rounded-xl p-3 shrink-0"
            style={{ background: '#f1f5f9' }}
          >
            {/* Header da coluna */}
            <div className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col.dot }} />
              <span className="text-sm font-bold text-[#1e293b]">{col.label}</span>
              <span className="ml-auto text-xs font-semibold text-[#9ca3af] bg-white rounded-full px-2 py-0.5">
                {col.cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {col.cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl p-3 shadow-sm group cursor-pointer"
                  style={{ borderLeft: `3px solid ${card.priColor}` }}
                >
                  {/* Título + remove */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[13px] font-semibold text-[#1e293b] leading-snug flex-1">{card.titulo}</p>
                    <button
                      type="button"
                      onClick={() => removeCard(col.id, card.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-500 transition-all shrink-0"
                      aria-label="Remover cartão"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tag + prazo */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: '#f3e8ff', color: '#7c3aed' }}
                    >
                      {card.tag}
                    </span>
                    <span className="text-[11px] text-[#94a3b8]">{card.prazo}</span>
                  </div>

                  {/* Avatar + prioridade */}
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
                      style={{
                        width: 22,
                        height: 22,
                        background: '#0f2d5e',
                        fontSize: '9px',
                      }}
                    >
                      {card.initials}
                    </span>
                    <span
                      className="text-[10.5px] font-semibold"
                      style={{ color: card.priColor }}
                    >
                      {card.prioridade}
                    </span>
                  </div>
                </div>
              ))}

              {/* Adicionar cartão */}
              <button
                type="button"
                onClick={() => setAddingTo(col.id)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#64748b] hover:text-[#0f2d5e] rounded-xl transition-colors"
                style={{ border: '1px dashed #cbd5e1' }}
              >
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
