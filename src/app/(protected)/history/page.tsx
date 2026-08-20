'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DataJudSearchRecord } from '@/db/datajud';

const PAGE_LIMIT = 20;

const GRAU_LABEL: Record<string, string> = {
  G1: '1ª Instância',
  G2: '2ª Instância',
  JE: 'Juizados Especiais',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPeriod(from: string | null, to: string | null): string {
  if (!from && !to) return 'Todo o histórico';
  if (from && to) return `${formatDate(from)} a ${formatDate(to)}`;
  if (from) return `a partir de ${formatDate(from)}`;
  return `até ${formatDate(to)}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [searches, setSearches] = useState<DataJudSearchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const loadHistory = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/datajud/searches?page=${p}&limit=${PAGE_LIMIT}`);
      if (!res.ok) throw new Error('Erro ao carregar histórico');
      const data = await res.json() as { searches: DataJudSearchRecord[]; total: number };
      setSearches(data.searches);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(page);
  }, [loadHistory, page]);

  function handleRerun(record: DataJudSearchRecord) {
    const params = new URLSearchParams({ keyword: record.keyword });
    if (record.grau) params.set('grau', record.grau);
    if (record.dateFrom) params.set('dateFrom', record.dateFrom);
    if (record.dateTo) params.set('dateTo', record.dateTo);
    router.push(`/search?${params.toString()}`);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Buscas</h1>
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Buscas</h1>
        <div role="alert" className="p-4 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Buscas</h1>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nenhuma busca realizada ainda</p>
          <Link
            href="/search"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Fazer primeira busca
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Buscas</h1>

      <div className="space-y-3 mb-6">
        {searches.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate mb-1">{s.keyword}</p>
              <p className="text-xs text-gray-500 mb-1">
                {s.grau ? GRAU_LABEL[s.grau] ?? s.grau : 'Todas as instâncias'} · {formatPeriod(s.dateFrom, s.dateTo)}
              </p>
              <p className="text-xs text-gray-500 mb-1">
                {s.totalResults.toLocaleString('pt-BR')} resultado{s.totalResults !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400">Executada em {formatDateTime(s.createdAt)}</p>
            </div>

            <button
              onClick={() => handleRerun(s)}
              className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Reexecutar
            </button>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
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
