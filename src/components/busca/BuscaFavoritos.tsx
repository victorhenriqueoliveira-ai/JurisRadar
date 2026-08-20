'use client';

import { useState, useEffect } from 'react';

export interface Favorito {
  id: string;
  nome: string;
  params: Record<string, string>;
}

export interface BuscaFavoritosProps {
  fonte: 'datajud' | 'dje' | 'pje';
  onAplicar: (params: Record<string, string>) => void;
}

/**
 * Componente de buscas favoritas salvas no localStorage por fonte.
 *
 * Permite listar, aplicar e remover favoritos salvos pelo usuário.
 */
export default function BuscaFavoritos({ fonte, onAplicar }: BuscaFavoritosProps) {
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [open, setOpen] = useState(false);

  const storageKey = `favoritos_${fonte}`;

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        setFavoritos(JSON.parse(raw) as Favorito[]);
      } catch {
        setFavoritos([]);
      }
    }
  }, [storageKey]);

  function handleRemover(id: string) {
    const updated = favoritos.filter((f) => f.id !== id);
    setFavoritos(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  function handleAplicar(favorito: Favorito) {
    onAplicar(favorito.params);
    setOpen(false);
  }

  if (favoritos.length === 0) return null;

  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-sm" data-testid="busca-favoritos">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        data-testid="btn-toggle-favoritos"
      >
        <span>Buscas favoritas <span className="text-gray-400 font-normal">({favoritos.length})</span></span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-200 divide-y divide-gray-100" data-testid="lista-favoritos">
          {favoritos.map((fav) => (
            <div
              key={fav.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
              data-testid={`favorito-${fav.id}`}
            >
              <button
                type="button"
                onClick={() => handleAplicar(fav)}
                className="flex-1 text-left text-sm text-gray-800 hover:text-blue-700 truncate pr-2"
                data-testid={`btn-aplicar-favorito-${fav.id}`}
              >
                {fav.nome}
              </button>
              <button
                type="button"
                onClick={() => handleRemover(fav.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                aria-label={`Remover favorito ${fav.nome}`}
                data-testid={`btn-remover-favorito-${fav.id}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
