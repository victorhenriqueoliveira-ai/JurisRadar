'use client';

import { useState } from 'react';
import { FolderOpen } from 'lucide-react';

interface Caso {
  id: string;
  titulo: string;
  cliente: string;
  advogado: string;
  status: string;
  statusBg: string;
  statusColor: string;
  checkColor: string;
}

const CASOS: Caso[] = [
  {
    id: '1',
    titulo: 'Investigação — Fraude contratual',
    cliente: 'Empresa Vetor Ltda',
    advogado: 'Cleberson Bezerra',
    status: 'Ativo',
    statusBg: '#eff6ff',
    statusColor: '#1d4ed8',
    checkColor: '#1d4ed8',
  },
  {
    id: '2',
    titulo: 'Disputa societária',
    cliente: 'Condomínio Alfa',
    advogado: 'Ana Ferreira',
    status: 'Ativo',
    statusBg: '#eff6ff',
    statusColor: '#1d4ed8',
    checkColor: '#1d4ed8',
  },
  {
    id: '3',
    titulo: 'Due diligence — Aquisição',
    cliente: 'Banco Bradesco',
    advogado: 'Cleberson Bezerra',
    status: 'Concluído',
    statusBg: '#f1f5f9',
    statusColor: '#475569',
    checkColor: '#475569',
  },
  {
    id: '4',
    titulo: 'Apuração de indícios',
    cliente: 'João da Silva',
    advogado: 'Marina Costa',
    status: 'Pausado',
    statusBg: '#fef3c7',
    statusColor: '#92400e',
    checkColor: '#d97706',
  },
];

export default function CasosPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Casos / Investigações
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">Gerencie casos complexos e investigações em curso</p>
        </div>
        {selected.size >= 2 && (
          <button
            type="button"
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] text-white text-sm font-semibold rounded-xl hover:bg-[#6d28d9] transition-colors shrink-0"
          >
            <FolderOpen className="w-4 h-4" />
            Agrupar casos ({selected.size})
          </button>
        )}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {CASOS.map((caso) => {
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
              {/* Top row: checkbox + título + status pill */}
              <div className="flex items-start gap-2.5">
                {/* Checkbox quadrado */}
                <div
                  className="mt-0.5 shrink-0"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `2px solid ${caso.checkColor}`,
                    background: isSelected ? caso.checkColor : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Título */}
                <h3 className="flex-1 text-[15px] font-bold text-[#1e293b] leading-snug">{caso.titulo}</h3>

                {/* Status pill */}
                <span
                  className="shrink-0 ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: caso.statusBg, color: caso.statusColor }}
                >
                  {caso.status}
                </span>
              </div>

              {/* Info lines */}
              <div className="mt-3 space-y-1 pl-[22px]">
                <p className="text-[13px] text-[#64748b]">
                  <span className="text-[#94a3b8]">Cliente:</span> {caso.cliente}
                </p>
                <p className="text-[13px] text-[#64748b]">
                  <span className="text-[#94a3b8]">Responsável:</span> {caso.advogado}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {selected.size === 1 && (
        <p className="text-xs text-[#94a3b8] text-center">Selecione 2 ou mais casos para agrupá-los.</p>
      )}
    </div>
  );
}
