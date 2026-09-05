'use client';

import { useState } from 'react';
import { Plus, X, Building2, Users } from 'lucide-react';

type Tipo = 'Pessoa Física' | 'Pessoa Jurídica';

interface Cliente {
  id: string;
  nome: string;
  tipo: Tipo;
  processos: number;
  contato: string;
}

const CLIENTES_INICIAIS: Cliente[] = [
  { id: '1', nome: 'Banco Bradesco', tipo: 'Pessoa Jurídica', processos: 12, contato: 'juridico@bradesco.com.br' },
  { id: '2', nome: 'Condomínio Alfa', tipo: 'Pessoa Jurídica', processos: 3, contato: 'sindico@alfa.com.br' },
  { id: '3', nome: 'João da Silva', tipo: 'Pessoa Física', processos: 1, contato: 'joao.silva@email.com' },
  { id: '4', nome: 'Empresa Vetor Ltda', tipo: 'Pessoa Jurídica', processos: 5, contato: 'contato@vetor.com.br' },
  { id: '5', nome: 'Seguradora Sul', tipo: 'Pessoa Jurídica', processos: 8, contato: 'contencioso@segsul.com.br' },
];

function NovoClienteModal({ tipo, onClose, onSave }: {
  tipo: Tipo;
  onClose: () => void;
  onSave: (c: Omit<Cliente, 'id' | 'processos'>) => void;
}) {
  const isPF = tipo === 'Pessoa Física';
  const [nome, setNome] = useState('');
  const [doc, setDoc] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    onSave({ nome: nome.trim(), tipo, contato: email.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {isPF ? 'Novo cliente' : 'Nova empresa'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-[#64748b]">
            {tipo}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isPF ? 'Nome completo' : 'Razão social'}
            </label>
            <input
              autoFocus
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isPF ? 'CPF' : 'CNPJ'}
            </label>
            <input
              type="text"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder={isPF ? '000.000.000-00' : '00.000.000/0001-00'}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>(CLIENTES_INICIAIS);
  const [modalTipo, setModalTipo] = useState<Tipo | null>(null);

  function addCliente(data: Omit<Cliente, 'id' | 'processos'>) {
    setClientes((prev) => [{ ...data, id: String(Date.now()), processos: 0 }, ...prev]);
  }

  return (
    <div className="flex flex-col gap-6">
      {modalTipo && (
        <NovoClienteModal
          tipo={modalTipo}
          onClose={() => setModalTipo(null)}
          onSave={addCliente}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Clientes & Empresas
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">Cadastro de pessoas físicas e jurídicas.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setModalTipo('Pessoa Física')}
            className="flex items-center gap-2 px-4 py-2 border border-[#0f2d5e] text-[#0f2d5e] text-sm font-semibold rounded-xl hover:bg-[#0f2d5e]/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo cliente
          </button>
          <button
            type="button"
            onClick={() => setModalTipo('Pessoa Jurídica')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova empresa
          </button>
        </div>
      </div>

      {/* Tabela — 4 colunas: Nome, Tipo, Processos, Contato */}
      <div className="bg-white border border-[#e2e8f0] rounded-[14px] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Nome</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Tipo</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Processos</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Contato</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-[#94a3b8] text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          c.tipo === 'Pessoa Jurídica' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {c.tipo === 'Pessoa Jurídica' ? <Building2 className="w-4 h-4" /> : c.nome[0]}
                      </div>
                      <span className="font-medium text-[#1e293b]">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                        c.tipo === 'Pessoa Jurídica' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {c.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-[#1e293b]">{c.processos}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[#64748b]">{c.contato || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
