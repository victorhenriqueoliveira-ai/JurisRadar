'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import PublicationCard, { Publication } from '@/components/dje/PublicationCard';
import BuscaFavoritos from '@/components/busca/BuscaFavoritos';

const formSchema = z
  .object({
    term: z.string().min(2, 'Mínimo 2 caracteres'),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida'),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida'),
  })
  .refine((d) => new Date(d.dateTo) >= new Date(d.dateFrom), {
    message: 'Data final deve ser maior ou igual à data inicial',
    path: ['dateTo'],
  });

type FormValues = z.infer<typeof formSchema>;

interface SearchResult {
  searchId: string;
  results: Publication[];
  total: number;
  page: number;
  totalPages: number;
}

const LIMIT = 50;

function DjePageContent() {
  const searchParams = useSearchParams();
  const searchId = searchParams.get('searchId');

  const [searchState, setSearchState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: SearchResult }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const [favoritoSalvo, setFavoritoSalvo] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!searchId) return;
    setSearchState({ status: 'loading' });
    fetch(`/api/dje/searches/${searchId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Busca não encontrada');
        return res.json() as Promise<{
          search: { term: string; dateFrom: string; dateTo: string };
          results: Publication[];
          total: number;
          page: number;
          totalPages: number;
        }>;
      })
      .then((data) => {
        setValue('term', data.search.term);
        setValue('dateFrom', data.search.dateFrom);
        setValue('dateTo', data.search.dateTo);
        setSearchState({
          status: 'success',
          data: { searchId, results: data.results ?? [], total: data.total ?? 0, page: data.page ?? 1, totalPages: data.totalPages ?? 1 },
        });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar busca';
        setSearchState({ status: 'error', message: msg });
      });
  }, [searchId, setValue]);

  async function executeSearch(values: FormValues, page: number) {
    setSearchState({ status: 'loading' });
    try {
      const response = await fetch('/api/dje/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: values.term, dateFrom: values.dateFrom, dateTo: values.dateTo, page, limit: LIMIT }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as Record<string, string>)?.error ?? `Erro ${response.status}`);
      }
      const data: SearchResult = await response.json();
      setSearchState({ status: 'success', data });
    } catch (e) {
      setSearchState({ status: 'error', message: e instanceof Error ? e.message : 'Erro desconhecido' });
    }
  }

  async function handleNextPage() {
    if (searchState.status !== 'success') return;
    const { page, totalPages } = searchState.data;
    if (page >= totalPages) return;
    await executeSearch(getValues(), page + 1);
  }

  async function handlePrevPage() {
    if (searchState.status !== 'success') return;
    const { page } = searchState.data;
    if (page <= 1) return;
    await executeSearch(getValues(), page - 1);
  }

  function handleSalvarFavorito() {
    const values = getValues();
    const nome = prompt('Nome para salvar este favorito:');
    if (!nome) return;
    const key = 'favoritos_dje';
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ id: string; nome: string; params: Record<string, string> }>;
    existing.unshift({ id: crypto.randomUUID(), nome, params: { term: values.term, dateFrom: values.dateFrom, dateTo: values.dateTo } });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
    setFavoritoSalvo(true);
    setTimeout(() => setFavoritoSalvo(false), 2000);
  }

  function applyFavorito(params: Record<string, string>) {
    if (params.term) setValue('term', params.term);
    if (params.dateFrom) setValue('dateFrom', params.dateFrom);
    if (params.dateTo) setValue('dateTo', params.dateTo);
    void executeSearch(getValues(), 1);
  }

  const isLoading = searchState.status === 'loading';

  return (
    <div className="space-y-6">
      {/* Favoritos */}
      <BuscaFavoritos fonte="dje" onAplicar={applyFavorito} />

      <div
        role="note"
        className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1"
        data-testid="coverage-notice"
      >
        <p className="font-semibold">DJe TJSP — Diário da Justiça Eletrônico do Tribunal de Justiça de SP</p>
        <p><strong>Delay de 1 a 2 dias úteis</strong> — publicações são indexadas após a disponibilização no portal do TJSP.</p>
        <p>Cobertura: Cadernos 2 e 3 (Capital). Interior e outros tribunais não cobertos.</p>
      </div>

      <form
        onSubmit={handleSubmit((values) => executeSearch(values, 1))}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
        noValidate
      >
        <div>
          <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">
            Termo de busca
          </label>
          <input
            id="term"
            type="text"
            placeholder="Ex: rescisão contratual"
            {...register('term')}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          {errors.term && (
            <p role="alert" className="mt-1 text-xs text-red-600">{errors.term.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
              Data inicial
            </label>
            <input
              id="dateFrom"
              type="date"
              {...register('dateFrom')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            {errors.dateFrom && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.dateFrom.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
              Data final
            </label>
            <input
              id="dateTo"
              type="date"
              {...register('dateTo')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            {errors.dateTo && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.dateTo.message}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="search-button"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
          {searchState.status === 'success' && (
            <button
              type="button"
              onClick={handleSalvarFavorito}
              data-testid="btn-salvar-favorito"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {favoritoSalvo ? '✓ Salvo!' : '★ Salvar busca'}
            </button>
          )}
        </div>
      </form>

      {searchState.status === 'error' && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {searchState.message}
        </div>
      )}

      {searchState.status === 'success' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {searchState.data.total === 0
              ? 'Nenhuma publicação encontrada.'
              : `${searchState.data.total} publicação${searchState.data.total !== 1 ? 'ões' : ''} encontrada${searchState.data.total !== 1 ? 's' : ''}`}
            {searchState.data.totalPages > 1 && ` — página ${searchState.data.page} de ${searchState.data.totalPages}`}
          </p>

          {searchState.data.results.length === 0 && (
            <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-8 text-center" data-testid="empty-state">
              <p className="text-sm font-medium text-gray-900">Nenhuma publicação encontrada para os filtros informados.</p>
              <p className="mt-1 text-xs text-gray-500">
                Tente ampliar o período ou usar um termo diferente.
              </p>
            </div>
          )}

          {searchState.data.results.length > 0 && (
            <div className="space-y-3">
              {searchState.data.results.map((pub) => (
                <PublicationCard key={pub.id} publication={pub} />
              ))}
            </div>
          )}

          {searchState.data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2" data-testid="pagination">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={searchState.data.page <= 1 || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                data-testid="prev-page"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">
                {searchState.data.page} / {searchState.data.totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={searchState.data.page >= searchState.data.totalPages || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                data-testid="next-page"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BuscaDjePage() {
  return (
    <Suspense>
      <DjePageContent />
    </Suspense>
  );
}
