'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  formatPeriod,
  formatDateTime,
  fetchDjeSearchHistory,
  rerunDjeSearch,
  triggerCsvDownload,
  type DjeSearchItem,
} from '@/components/history/utils';

const PAGE_LIMIT = 20;

/**
 * Página de histórico de buscas DJE.
 *
 * Exibe as buscas anteriores do advogado com:
 * - Termo de busca
 * - Período (dateFrom a dateTo) formatado como DD/MM/YYYY
 * - Total de resultados da última execução
 * - Data/hora de execução no formato DD/MM/YYYY HH:mm
 *
 * Cada item tem botões:
 * - "Reexecutar": POST /api/dje/searches/[id]/rerun → navega para /dje?searchId=newId
 * - "Exportar CSV": download via link temporário sem sair da página
 */
export default function DjeHistoryPage() {
  const router = useRouter();

  const [searches, setSearches] = useState<DjeSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const loadHistory = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDjeSearchHistory(p, PAGE_LIMIT);
      setSearches(data.searches);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(page);
  }, [loadHistory, page]);

  async function handleRerun(id: string) {
    setRerunningId(id);
    try {
      const newSearchId = await rerunDjeSearch(id);
      router.push(`/dje?searchId=${newSearchId}`);
    } catch {
      setRerunningId(null);
    }
  }

  function handleExportCsv(id: string) {
    triggerCsvDownload(id);
  }

  // ── Estados de carregamento / erro ─────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Buscas DJE</h1>
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Buscas DJE</h1>
        <div role="alert" className="p-4 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // ── Estado de lista vazia ──────────────────────────────────────────────────

  if (searches.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Buscas DJE</h1>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nenhuma busca realizada ainda</p>
          <Link
            href="/dje"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Fazer primeira busca
          </Link>
        </div>
      </div>
    );
  }

  // ── Lista de buscas ────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Buscas DJE</h1>

      <div className="space-y-3 mb-6">
        {searches.map((search) => {
          const isRerunning = rerunningId === search.id;

          return (
            <div
              key={search.id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Informações da busca */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate mb-1">
                  {search.term}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  Período: {formatPeriod(search.dateFrom, search.dateTo)}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  {search.totalResults} resultado{search.totalResults !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-400">
                  Executada em {formatDateTime(search.executedAt)}
                </p>
              </div>

              {/* Ações */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => void handleRerun(search.id)}
                  disabled={isRerunning}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRerunning ? 'Reexecutando...' : 'Reexecutar'}
                </button>

                <button
                  onClick={() => handleExportCsv(search.id)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Exportar CSV
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>

          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
