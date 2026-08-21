'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';

interface Cliente {
  org: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    onboardingCompletedAt: string | null;
  };
  sub: {
    status: string;
    plan: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  } | null;
  membros: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-yellow-100 text-yellow-700',
  past_due: 'bg-red-100 text-red-600',
  canceled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Trial',
  past_due: 'Em atraso',
  canceled: 'Cancelado',
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set('q', q);
      const res = await fetch(`/api/admin/clientes?${params}`);
      const data = await res.json();
      setClientes(data.clientes ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(search);
    setPage(1);
  }

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Clientes
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">{total} escritórios cadastrados.</p>
        </div>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar escritório..."
            className="w-full pl-9 pr-3 py-2 border border-[#e5e7eb] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 focus:border-[#0f2d5e]"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-[#0f2d5e] text-white text-sm font-semibold rounded-xl hover:bg-[#1a4a8a] transition-colors">
          Buscar
        </button>
      </form>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Escritório</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Status</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Plano</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Membros</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Criado em</th>
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-[.04em] text-[#9ca3af]">Vencimento</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Building2 className="w-8 h-8 text-[#e5e7eb] mx-auto mb-2" />
                  <p className="text-sm text-[#9ca3af]">Nenhum cliente encontrado.</p>
                </td>
              </tr>
            ) : (
              clientes.map(({ org, sub, membros }) => {
                const status = sub?.status ?? 'sem_assinatura';
                return (
                  <tr key={org.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#111827]">{org.name}</p>
                      <p className="text-xs text-[#9ca3af]">{org.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[status] ?? status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#374151] capitalize">{sub?.plan ?? '—'}</td>
                    <td className="px-4 py-3 text-[#374151]">{membros}</td>
                    <td className="px-4 py-3 text-[#374151]">{fmt(org.createdAt)}</td>
                    <td className="px-4 py-3 text-[#374151]">
                      {sub?.trialEndsAt ? `Trial até ${fmt(sub.trialEndsAt)}` : fmt(sub?.currentPeriodEnd)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clientes/${org.id}`}
                        className="text-[#0f2d5e] text-xs font-semibold hover:underline"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[#9ca3af]">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#e5e7eb] disabled:opacity-40 hover:bg-[#f9fafb] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#e5e7eb] disabled:opacity-40 hover:bg-[#f9fafb] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
