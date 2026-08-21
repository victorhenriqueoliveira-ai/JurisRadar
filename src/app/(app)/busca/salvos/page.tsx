'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, Newspaper, Radar, Search } from 'lucide-react';

interface Favorito {
  id: string;
  nome: string;
  params: Record<string, string>;
}

const FONTES = [
  { key: 'djen', label: 'DJEN Nacional', icon: Radar, href: '/busca/djen-nacional' },
  { key: 'datajud', label: 'DataJud / CNJ', icon: Database, href: '/busca/datajud' },
  { key: 'dje', label: 'DJe TJSP', icon: Newspaper, href: '/busca/dje' },
  { key: 'pje', label: 'PJe Nacional', icon: Search, href: '/busca/pje' },
] as const;

function paramLabel(params: Record<string, string>): string {
  const parts = [
    params.numeroProcesso,
    params.keyword,
    params.texto,
    params.term,
    params.termo,
    params.nomeParte,
  ].filter(Boolean);
  return parts.join(' · ') || 'Busca salva';
}

export default function SalvosPage() {
  const [byFonte, setByFonte] = useState<Record<string, Favorito[]>>({});

  useEffect(() => {
    const result: Record<string, Favorito[]> = {};
    for (const f of FONTES) {
      const raw = localStorage.getItem(`favoritos_${f.key}`);
      if (raw) {
        try {
          result[f.key] = JSON.parse(raw) as Favorito[];
        } catch {
          result[f.key] = [];
        }
      }
    }
    setByFonte(result);
  }, []);

  function remover(fonte: string, id: string) {
    const updated = (byFonte[fonte] ?? []).filter((f) => f.id !== id);
    setByFonte((prev) => ({ ...prev, [fonte]: updated }));
    localStorage.setItem(`favoritos_${fonte}`, JSON.stringify(updated));
  }

  const total = Object.values(byFonte).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
        Buscas salvas por fonte. Para salvar uma busca, realize a pesquisa e clique em <strong>★ Salvar busca</strong>.
      </div>

      {total === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhuma busca salva ainda.</p>
      ) : (
        FONTES.map(({ key, label, icon: Icon, href }) => {
          const favs = byFonte[key] ?? [];
          if (favs.length === 0) return null;
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
                <span className="text-xs text-gray-400">({favs.length})</span>
              </div>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white overflow-hidden">
                {favs.map((fav) => (
                  <div key={fav.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{fav.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{paramLabel(fav.params)}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <Link
                        href={`${href}?${new URLSearchParams(fav.params).toString()}`}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Buscar
                      </Link>
                      <button
                        type="button"
                        onClick={() => remover(key, fav.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Remover ${fav.nome}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
