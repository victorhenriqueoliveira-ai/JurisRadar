'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

type Prioridade = 'Urgente' | 'Alta' | 'Média' | 'Baixa';

interface Tarefa {
  id: string;
  titulo: string;
  processo: string;
  prioridade: Prioridade;
  dotColor: string;
  bg: string;
  color: string;
  prazo: string;
}

const PRIORIDADE_CONFIG: Record<Prioridade, { dotColor: string; bg: string; color: string }> = {
  Urgente: { dotColor: '#dc2626', bg: '#fee2e2', color: '#b91c1c' },
  Alta:    { dotColor: '#ea580c', bg: '#ffedd5', color: '#c2410c' },
  Média:   { dotColor: '#d97706', bg: '#fef3c7', color: '#92400e' },
  Baixa:   { dotColor: '#94a3b8', bg: '#f1f5f9', color: '#475569' },
};

const TAREFAS_INICIAIS: Tarefa[] = [
  {
    id: '1',
    titulo: 'Protocolar contestação',
    processo: 'Proc. 1501260-42.2024',
    prioridade: 'Urgente',
    dotColor: '#dc2626',
    bg: '#fee2e2',
    color: '#b91c1c',
    prazo: 'Hoje',
  },
  {
    id: '2',
    titulo: 'Ligar para cliente João Silva',
    processo: 'CRM · Lead',
    prioridade: 'Média',
    dotColor: '#d97706',
    bg: '#fef3c7',
    color: '#92400e',
    prazo: 'Amanhã',
  },
  {
    id: '3',
    titulo: 'Revisar minuta de recurso',
    processo: 'Proc. 0624936-96.2023',
    prioridade: 'Alta',
    dotColor: '#ea580c',
    bg: '#ffedd5',
    color: '#c2410c',
    prazo: '3 dias',
  },
  {
    id: '4',
    titulo: 'Enviar honorário para aprovação',
    processo: 'Financeiro',
    prioridade: 'Baixa',
    dotColor: '#94a3b8',
    bg: '#f1f5f9',
    color: '#475569',
    prazo: '5 dias',
  },
];

function NovaTarefaModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (t: Omit<Tarefa, 'id' | 'dotColor' | 'bg' | 'color'>) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('Média');
  const [prazo, setPrazo] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onSave({ titulo: titulo.trim(), processo: '—', prioridade, prazo: prazo || '—' });
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
              <option>Urgente</option>
              <option>Alta</option>
              <option>Média</option>
              <option>Baixa</option>
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

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>(TAREFAS_INICIAIS);
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function addTarefa(data: Omit<Tarefa, 'id' | 'dotColor' | 'bg' | 'color'>) {
    const cfg = PRIORIDADE_CONFIG[data.prioridade];
    setTarefas((prev) => [
      { ...data, id: String(Date.now()), dotColor: cfg.dotColor, bg: cfg.bg, color: cfg.color },
      ...prev,
    ]);
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
                  border: `2px solid ${tarefa.dotColor}`,
                  background: isChecked ? tarefa.dotColor : 'transparent',
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
                <p className="text-xs text-[#94a3b8] mt-0.5 truncate">{tarefa.processo}</p>
              </div>

              {/* Pill de prioridade */}
              <span
                className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: tarefa.bg, color: tarefa.color }}
              >
                {tarefa.prioridade}
              </span>

              {/* Prazo */}
              <span className="shrink-0 text-sm text-[#64748b] min-w-[56px] text-right">
                {tarefa.prazo}
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
