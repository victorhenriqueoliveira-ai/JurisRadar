'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app/busca/datajud', label: 'DataJud / CNJ', description: 'Processos do TJSP via base nacional CNJ' },
  { href: '/app/busca/dje', label: 'DJe TJSP', description: 'Publicações do Diário da Justiça Eletrônico' },
  { href: '/app/busca/pje', label: 'PJe Nacional', description: 'Busca no Diário da Justiça Nacional Eletrônico' },
];

export default function BuscaHubPage() {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Busca Avançada</h1>
        <p className="mt-1 text-sm text-gray-500">
          Busque processos e publicações em múltiplas fontes jurídicas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg border p-5 transition-all hover:shadow-md ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className={`font-semibold text-sm ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                {tab.label}
              </p>
              <p className="mt-1 text-xs text-gray-500">{tab.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Selecione uma das fontes acima para iniciar sua busca.
      </div>
    </div>
  );
}
