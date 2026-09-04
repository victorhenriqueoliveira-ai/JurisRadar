'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Database, Newspaper, Radar, Search, Star } from 'lucide-react';

const TABS = [
  { href: '/busca/djen-nacional', label: 'DJEN Nacional', icon: Radar },
  { href: '/busca/datajud', label: 'DataJud / CNJ', icon: Database },
  { href: '/busca/dje', label: 'DJe TJSP', icon: Newspaper },
  { href: '/busca/pje', label: 'PJe Nacional', icon: Search },
  { href: '/busca/salvos', label: 'Salvos', icon: Star },
];

export default function BuscaLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full flex flex-col flex-1">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Busca Avançada
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Busque processos e publicações em múltiplas fontes jurídicas.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#e5e7eb]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border border-b-0 transition-colors -mb-px ${
                active
                  ? 'bg-white border-[#e5e7eb] text-[#0f2d5e] border-b-white'
                  : 'border-transparent text-[#6b7280] hover:text-[#374151] hover:bg-[#f9fafb]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Conteúdo da aba ativa */}
      <div className="bg-white border border-[#e5e7eb] rounded-b-2xl rounded-tr-2xl p-6 shadow-sm flex flex-col flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
