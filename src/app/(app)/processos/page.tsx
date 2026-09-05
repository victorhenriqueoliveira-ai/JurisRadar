'use client';

import { useState } from 'react';
import { FileText, Upload, Plus } from 'lucide-react';

type Aba = 'digitacao' | 'lote';

export default function ProcessosPage() {
  const [aba, setAba] = useState<Aba>('digitacao');
  const [cnj, setCnj] = useState('');
  const [titulo, setTitulo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(true);
    setCnj('');
    setTitulo('');
    setResponsavel('');
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleImportar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setImportando(true);
    await new Promise((r) => setTimeout(r, 1200));
    setImportando(false);
    setImportSuccess(true);
    setArquivo(null);
    setTimeout(() => setImportSuccess(false), 3000);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Processos
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Adicione processos manualmente ou importe em lote</p>
      </div>

      {/* Abas */}
      <div className="flex gap-0 border-b border-[#e5e7eb]">
        {([['digitacao', 'Por digitação'], ['lote', 'Importar em lote']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              aba === id ? 'text-[#0f2d5e] border-[#0f2d5e]' : 'text-[#9ca3af] border-transparent hover:text-[#374151]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'digitacao' && (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#0f2d5e] mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Dados do processo
          </h2>
          <form onSubmit={handleCriar} className="space-y-4">
            {success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                ✓ Processo criado com sucesso!
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número CNJ <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={cnj}
                onChange={(e) => setCnj(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título / Descrição</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Ação de indenização — João Silva"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do advogado responsável"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !titulo.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Criando…' : 'Criar processo'}
            </button>
          </form>
        </div>
      )}

      {aba === 'lote' && (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#0f2d5e] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Importar em lote
          </h2>
          <p className="text-sm text-[#6b7280] mb-5">
            Envie um arquivo CSV ou XLSX com os números CNJ dos processos, um por linha.
          </p>
          <form onSubmit={handleImportar} className="space-y-4">
            {importSuccess && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                ✓ Importação iniciada! Os processos aparecerão no CRM em instantes.
              </div>
            )}
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) setArquivo(f);
              }}
              className={`flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                dragOver ? 'border-[#0f2d5e] bg-[#0f2d5e]/5' : 'border-[#e5e7eb] hover:border-[#0f2d5e]/40 hover:bg-gray-50'
              }`}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
              <Upload className={`w-8 h-8 ${dragOver ? 'text-[#0f2d5e]' : 'text-[#9ca3af]'}`} />
              {arquivo ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#0f2d5e]">{arquivo.name}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">{(arquivo.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-[#374151]">Arraste um arquivo aqui</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">ou clique para selecionar — CSV, XLSX</p>
                </div>
              )}
            </label>
            <button
              type="submit"
              disabled={!arquivo || importando}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {importando ? 'Importando…' : 'Importar lista'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
