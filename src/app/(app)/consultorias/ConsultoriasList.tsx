'use client';

import { useState } from 'react';
import { Plus, X, Briefcase } from 'lucide-react';

type StatusConsultoria = 'em_andamento' | 'concluida' | 'aguardando' | 'cancelada' | 'pendente';

interface ConsultoriaRow {
  id: string;
  titulo: string;
  clienteNome: string | null;
  valorEstimado: string | null;
  data: string | null;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  em_andamento: { label: 'Em andamento', color: 'bg-blue-50 text-blue-700' },
  concluida:    { label: 'Concluída',     color: 'bg-green-50 text-green-700' },
  aguardando:   { label: 'Aguardando',    color: 'bg-amber-50 text-amber-700' },
  cancelada:    { label: 'Cancelada',     color: 'bg-gray-100 text-gray-500' },
  pendente:     { label: 'Pendente',      color: 'bg-slate-100 text-slate-600' },
};

function formatBRL(v: string | null) {
  if (!v) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string | null) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function NovaConsultoriaModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (data: { titulo: string; valorEstimado?: number; data?: string; status: string }) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [status, setStatus] = useState<StatusConsultoria>('em_andamento');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onSave({
      titulo: titulo.trim(),
      valorEstimado: valor ? parseFloat(valor.replace(',', '.')) : undefined,
      data: data || undefined,
      status,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Nova consultoria</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input autoFocus type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor estimado (R$)</label>
              <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusConsultoria)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30">
              <option value="em_andamento">Em andamento</option>
              <option value="aguardando">Aguardando</option>
              <option value="pendente">Pendente</option>
              <option value="concluida">Concluída</option>
            </select>
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

export default function ConsultoriasList({ initialData }: { initialData: ConsultoriaRow[] }) {
  const [consultorias, setConsultorias] = useState<ConsultoriaRow[]>(initialData);
  const [showModal, setShowModal] = useState(false);

  async function addConsultoria(data: { titulo: string; valorEstimado?: number; data?: string; status: string }) {
    const res = await fetch('/api/consultorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json() as ConsultoriaRow;
      setConsultorias((prev) => [{ ...created, clienteNome: null }, ...prev]);
    }
  }

  const totalEstimado = consultorias.reduce((sum, c) => sum + (c.valorEstimado ? Number(c.valorEstimado) : 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {showModal && <NovaConsultoriaModal onClose={() => setShowModal(false)} onSave={addConsultoria} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Consultorias</h1>
          <p className="mt-1 text-sm text-[#6b7280]">{consultorias.length} consultorias · Total estimado: {formatBRL(String(totalEstimado))}</p>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Nova consultoria
        </button>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Título</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Cliente</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Valor estimado</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Data</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Status</th>
            </tr>
          </thead>
          <tbody>
            {consultorias.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-[#9ca3af] text-sm"><Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />Nenhuma consultoria cadastrada.</td></tr>
            ) : consultorias.map((c) => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG['pendente'];
              return (
                <tr key={c.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#1e293b]">{c.titulo}</td>
                  <td className="px-5 py-3.5 text-[#6b7280]">{c.clienteNome ?? '—'}</td>
                  <td className="px-5 py-3.5 font-semibold text-[#0f2d5e]">{formatBRL(c.valorEstimado)}</td>
                  <td className="px-5 py-3.5 text-[#6b7280]">{formatDate(c.data)}</td>
                  <td className="px-5 py-3.5"><span className={`inline-flex px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${cfg.color}`}>{cfg.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
