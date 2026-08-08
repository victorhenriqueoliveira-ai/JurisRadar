'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import ProcessoCard from '@/components/datajud/ProcessoCard';
import type { ProcessoResult } from '@/lib/datajud/types';

const GRAU_OPTIONS = [
  { value: 'G1', label: '1ª Instância' },
  { value: 'G2', label: '2ª Instância' },
  { value: 'JE', label: 'Juizados Especiais' },
  { value: '', label: 'Todas as instâncias' },
] as const;

const formSchema = z.object({
  keyword: z.string().min(2, 'Mínimo 2 caracteres'),
  grau: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SearchResult {
  results: ProcessoResult[];
  total: number;
  page: number;
  totalPages: number;
}

const LIMIT = 20;

const EXEMPLOS = ['Alimentos', 'Divórcio', 'Guarda', 'Indenização', 'Usucapião'];

export default function DataJudSearchPage() {
  const searchParams = useSearchParams();

  const [searchState, setSearchState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: SearchResult; keyword: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { grau: 'G1' },
  });

  // Preenche formulário e executa se vier do histórico (/search?keyword=...&grau=...)
  useEffect(() => {
    const keyword = searchParams.get('keyword');
    if (!keyword) return;
    const grau = searchParams.get('grau') ?? 'G1';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';
    setValue('keyword', keyword);
    setValue('grau', grau);
    if (dateFrom) setValue('dateFrom', dateFrom);
    if (dateTo) setValue('dateTo', dateTo);
    void executeSearch({ keyword, grau, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }, 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function executeSearch(values: FormValues, page: number) {
    setSearchState({ status: 'loading' });
    try {
      const response = await fetch('/api/datajud/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: values.keyword,
          ...(values.grau ? { grau: values.grau } : {}),
          ...(values.dateFrom ? { dateFrom: values.dateFrom } : {}),
          ...(values.dateTo ? { dateTo: values.dateTo } : {}),
          page,
          limit: LIMIT,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err?.error ?? `Erro ${response.status}`);
      }
      const data = await response.json() as SearchResult;
      setSearchState({ status: 'success', data, keyword: values.keyword });
    } catch (e) {
      setSearchState({ status: 'error', message: e instanceof Error ? e.message : 'Erro desconhecido' });
    }
  }

  function handleNextPage() {
    if (searchState.status !== 'success') return;
    if (searchState.data.page >= searchState.data.totalPages) return;
    void executeSearch(getValues(), searchState.data.page + 1);
  }

  function handlePrevPage() {
    if (searchState.status !== 'success') return;
    if (searchState.data.page <= 1) return;
    void executeSearch(getValues(), searchState.data.page - 1);
  }

  const isLoading = searchState.status === 'loading';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buscar Processos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Busque processos da 1ª instância do TJSP via DataJud/CNJ.
        </p>
      </div>

      <div
        role="note"
        className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800"
      >
        Use termos do vocabulário CNJ para melhores resultados:{' '}
        {EXEMPLOS.map((ex, i) => (
          <span key={ex}>
            <button
              type="button"
              className="underline font-medium hover:text-blue-900"
              onClick={() => setValue('keyword', ex)}
            >
              {ex}
            </button>
            {i < EXEMPLOS.length - 1 && ', '}
          </span>
        ))}
        . Para pensão alimentícia, use <strong>Alimentos</strong>.
      </div>

      <form
        onSubmit={handleSubmit((values) => executeSearch(values, 1))}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
        noValidate
      >
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
            Palavra-chave
          </label>
          <input
            id="keyword"
            type="text"
            placeholder="Ex: Alimentos, Divórcio, Indenização"
            {...register('keyword')}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          {errors.keyword && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.keyword.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="grau" className="block text-sm font-medium text-gray-700 mb-1">
            Instância
          </label>
          <select
            id="grau"
            {...register('grau')}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 bg-white"
          >
            {GRAU_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs text-gray-500">
            <span className="font-medium">Datas de distribuição</span> — o DataJud indexa processos com atraso de dias a semanas.
            Dados de 2024 e início de 2025 têm melhor cobertura; datas muito recentes podem não aparecer ainda.
            Deixe em branco para buscar em todo o histórico disponível.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
              Distribuído a partir de
            </label>
            <input
              id="dateFrom"
              type="date"
              {...register('dateFrom')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
              Distribuído até
            </label>
            <input
              id="dateTo"
              type="date"
              {...register('dateTo')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          data-testid="search-button"
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
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
              ? `Nenhum processo encontrado para "${searchState.keyword}".`
              : `${searchState.data.total.toLocaleString('pt-BR')} processo${searchState.data.total !== 1 ? 's' : ''} encontrado${searchState.data.total !== 1 ? 's' : ''}`}
            {searchState.data.totalPages > 1 &&
              ` — página ${searchState.data.page} de ${searchState.data.totalPages}`}
          </p>

          {searchState.data.results.length === 0 && (
            <div
              className="rounded-md bg-gray-50 border border-gray-200 px-4 py-8 text-center"
              data-testid="empty-state"
            >
              <p className="text-sm font-medium text-gray-900">
                Nenhum processo encontrado para os filtros informados.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Tente um termo diferente. Para pensão alimentícia, use <strong>Alimentos</strong>.
              </p>
            </div>
          )}

          {searchState.data.results.length > 0 && (
            <div className="space-y-3">
              {searchState.data.results.map((p) => (
                <ProcessoCard key={p.numero} processo={p} />
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
