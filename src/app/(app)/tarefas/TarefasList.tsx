'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type Prioridade = 'urgente' | 'alta' | 'media' | 'baixa';

interface Tarefa {
  id: string;
  titulo: string;
  processoRef: string | null;
  prioridade: string;
  prazo: string | null;
  status: string;
}

const PRIORIDADE_CONFIG: Record<string, { label: string; dotColor: string; bg: string; color: string }> = {
  urgente: { label: 'Urgente', dotColor: '#dc2626', bg: '#fee2e2', color: '#b91c1c' },
  alta:    { label: 'Alta',    dotColor: '#ea580c', bg: '#ffedd5', color: '#c2410c' },
  media:   { label: 'Média',   dotColor: '#d97706', bg: '#fef3c7', color: '#92400e' },
  baixa:   { label: 'Baixa',   dotColor: '#94a3b8', bg: '#f1f5f9', color: '#475569' },
};

function NovaTarefaModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (t: { titulo: string; prioridade: string; prazo: string }) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [prazo, setPrazo] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onSave({ titulo: titulo.trim(), prioridade, prazo });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Nova Tarefa
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
              placeholder="Descreva a tarefa…"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as Prioridade)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            >
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prazo <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            />
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
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TarefasList({ initialData }: { initialData: Tarefa[] }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(initialData);
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  async function addTarefa(data: { titulo: string; prioridade: string; prazo: string }) {
    try {
      const res = await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: data.titulo,
          prioridade: data.prioridade,
          prazo: data.prazo || undefined,
          status: 'pendente',
        }),
      });
      if (res.ok) {
        const nova = await res.json() as Tarefa;
        setTarefas((prev) => [nova, ...prev]);
      }
    } catch {
      // Falha silenciosa — otimistic update não aplicado
    }
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {showModal && <NovaTarefaModal onClose={() => setShowModal(false)} onSave={addTarefa} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Tarefas
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">Organize a rotina do escritório.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova tarefa
        </button>
      </div>

      {/* Lista em card branco */}
      <div className="bg-white border border-[#e2e8f0] rounded-[14px] overflow-hidden shadow-sm">
        {tarefas.map((tarefa, idx) => {
          const cfg = PRIORIDADE_CONFIG[tarefa.prioridade] ?? PRIORIDADE_CONFIG['media'];
          const isChecked = checked.has(tarefa.id);
          return (
            <div
              key={tarefa.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#f8fafc] ${
                idx !== tarefas.length - 1 ? 'border-b border-[#e2e8f0]' : ''
              }`}
            >
              {/* Checkbox colorido */}
              <button
                type="button"
                onClick={() => toggleCheck(tarefa.id)}
                className="shrink-0 flex items-center justify-center transition-colors"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: `2px solid ${cfg.dotColor}`,
                  background: isChecked ? cfg.dotColor : 'transparent',
                }}
                aria-label={isChecked ? 'Desmarcar' : 'Marcar como concluída'}
              >
                {isChecked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Título + processo */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold text-[#1e293b] leading-tight ${isChecked ? 'line-through opacity-50' : ''}`}
                >
                  {tarefa.titulo}
                </p>
                <p className="text-xs text-[#94a3b8] mt-0.5 truncate">{tarefa.processoRef ?? '—'}</p>
              </div>

              {/* Pill de prioridade */}
              <span
                className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>

              {/* Prazo */}
              <span className="shrink-0 text-sm text-[#64748b] min-w-[56px] text-right">
                {tarefa.prazo ?? '—'}
              </span>
            </div>
          );
        })}

        {tarefas.length === 0 && (
          <div className="py-14 text-center text-sm text-[#94a3b8]">
            Nenhuma tarefa. Crie a primeira pelo botão acima.
          </div>
        )}
      </div>
    </div>
  );
}
