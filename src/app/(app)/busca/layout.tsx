'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

const ROUTE_LABELS: Record<string, string> = {
  '/busca/djen-nacional': 'DJEN Nacional',
  '/busca/datajud': 'DataJud / CNJ',
  '/busca/dje': 'DJe TJSP',
  '/busca/pje': 'PJe Nacional',
  '/busca/salvos': 'Salvos',
};

export default function BuscaLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  const sourceLabel = ROUTE_LABELS[pathname] ?? 'Busca';
  const modeLabel = mode === 'ia' ? 'Busca com IA' : null;

  return (
    <div className="w-full flex flex-col flex-1">
      {/* Header */}
      {/* <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {ROUTE_LABELS[pathname]}
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Busque processos e publicações em múltiplas fontes jurídicas.
        </p>
      </div> */}

      {/* Breadcrumb pill
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] text-sm font-medium text-[#374151]">
          {sourceLabel}
          {modeLabel && (
            <>
              <span className="text-[#d1d5db] mx-0.5">·</span>
              <span className="text-purple-700">{modeLabel}</span>
            </>
          )}
        </span>
      </div> */}

      {/* Conteúdo */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
