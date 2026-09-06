'use client';

import { useState } from 'react';
import { Plus, X, Building2 } from 'lucide-react';

interface ClienteRow {
  id: string;
  nome: string;
  email: string | null;
  cpfCnpj: string | null;
}

function inferTipo(cpfCnpj: string | null): 'Pessoa Física' | 'Pessoa Jurídica' {
  if (!cpfCnpj) return 'Pessoa Física';
  const digits = cpfCnpj.replace(/\D/g, '');
  return digits.length > 11 ? 'Pessoa Jurídica' : 'Pessoa Física';
}

function NovoClienteModal({ tipo, onClose, onSave }: {
  tipo: 'pf' | 'pj';
  onClose: () => void;
  onSave: (data: { nome: string; cpfCnpj: string; email: string }) => void;
}) {
  const isPF = tipo === 'pf';
  const [nome, setNome] = useState('');
  const [doc, setDoc] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    onSave({ nome: nome.trim(), cpfCnpj: doc.trim(), email: email.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>{isPF ? 'Novo cliente' : 'Nova empresa'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isPF ? 'Nome completo' : 'Razão social'}</label>
            <input autoFocus type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{isPF ? 'CPF' : 'CNPJ'}</label>
            <input type="text" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder={isPF ? '000.000.000-00' : '00.000.000/0001-00'} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="flex-1 py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-lg hover:bg-[#1a3f7a]">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientesList({ initialData }: { initialData: ClienteRow[] }) {
  const [clientes, setClientes] = useState<ClienteRow[]>(initialData);
  const [modalTipo, setModalTipo] = useState<'pf' | 'pj' | null>(null);

  async function addCliente(data: { nome: string; cpfCnpj: string; email: string }) {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json() as ClienteRow;
      setClientes((prev) => [created, ...prev]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {modalTipo && <NovoClienteModal tipo={modalTipo} onClose={() => setModalTipo(null)} onSave={addCliente} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Clientes & Empresas</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Cadastro de pessoas físicas e jurídicas.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setModalTipo('pf')} className="flex items-center gap-2 px-4 py-2 border border-[#0f2d5e] text-[#0f2d5e] text-sm font-semibold rounded-xl hover:bg-[#0f2d5e]/5 transition-colors">
            <Plus className="w-4 h-4" /> Novo cliente
          </button>
          <button type="button" onClick={() => setModalTipo('pj')} className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors">
            <Plus className="w-4 h-4" /> Nova empresa
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-gray-50">
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Nome</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Tipo</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Contato</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 text-[#9ca3af] text-sm">Nenhum cliente cadastrado.</td></tr>
            ) : clientes.map((c) => {
              const tipo = inferTipo(c.cpfCnpj);
              const isPJ = tipo === 'Pessoa Jurídica';
              return (
                <tr key={c.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isPJ ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isPJ ? <Building2 className="w-4 h-4" /> : c.nome[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-[#1e293b]">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${isPJ ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#6b7280]">{c.email ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
