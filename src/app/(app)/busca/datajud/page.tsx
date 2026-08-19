'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import ProcessoCard from '@/components/datajud/ProcessoCard';
import type { ProcessoResult } from '@/lib/datajud/types';
import BotaoAdicionarCRM from '@/components/busca/BotaoAdicionarCRM';
import BuscaFavoritos from '@/components/busca/BuscaFavoritos';

// ── Paginação ─────────────────────────────────────────────────────────────────

function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  disabled: boolean;
  onPage: (p: number) => void;
}

function Pagination({ page, totalPages, disabled, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = pageRange(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 pt-4" data-testid="pagination">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1 || disabled}
        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        data-testid="prev-page"
      >
        ← Anterior
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm select-none">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              disabled={disabled}
              className={`min-w-[2rem] px-2 py-1.5 text-sm rounded-md border transition-colors disabled:cursor-not-allowed ${
                p === page
                  ? 'bg-blue-600 text-white border-blue-600 font-medium'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages || disabled}
        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        data-testid="next-page"
      >
        Próxima →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const GRAU_OPTIONS = [
  { value: 'G1', label: '1ª Instância' },
  { value: 'G2', label: '2ª Instância' },
  { value: 'JE', label: 'Juizados Especiais' },
  { value: '', label: 'Todas as instâncias' },
] as const;

const formSchema = z
  .object({
    numeroProcesso: z.string().optional(),
    keyword: z.string().optional(),
    comarca: z.string().optional(),
    grau: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .refine((d) => (d.keyword && d.keyword.length >= 2) || (d.numeroProcesso && d.numeroProcesso.length >= 5), {
    message: 'Informe uma palavra-chave (mín. 2 caracteres) ou número do processo',
    path: ['keyword'],
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

function DataJudSearchContent() {
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [searchState, setSearchState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: SearchResult; label: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { grau: 'G1' },
  });

  const numeroProcessoValue = watch('numeroProcesso');
  const byNumero = Boolean(numeroProcessoValue?.trim());

  useEffect(() => {
    const keyword = searchParams.get('keyword');
    const numeroProcesso = searchParams.get('numeroProcesso');
    if (!keyword && !numeroProcesso) return;
    const grau = searchParams.get('grau') ?? 'G1';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';
    if (keyword) setValue('keyword', keyword);
    if (numeroProcesso) setValue('numeroProcesso', numeroProcesso);
    setValue('grau', grau);
    if (dateFrom) setValue('dateFrom', dateFrom);
    if (dateTo) setValue('dateTo', dateTo);
    void executeSearch({ keyword: keyword ?? undefined, numeroProcesso: numeroProcesso ?? undefined, grau, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }, 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function executeSearch(values: FormValues, page: number) {
    setSearchState({ status: 'loading' });
    try {
      const response = await fetch('/api/datajud/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(values.keyword ? { keyword: values.keyword } : {}),
          ...(values.numeroProcesso ? { numeroProcesso: values.numeroProcesso } : {}),
          ...(values.comarca ? { comarca: values.comarca } : {}),
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
      const label = values.numeroProcesso ?? values.keyword ?? '';
      setSearchState({ status: 'success', data, label });
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e) {
      setSearchState({ status: 'error', message: e instanceof Error ? e.message : 'Erro desconhecido' });
    }
  }

  function handlePage(p: number) {
    void executeSearch(getValues(), p);
  }

  function getCurrentFavoritoData() {
    const values = getValues();
    return {
      fonte: 'datajud' as const,
      keyword: values.keyword,
      numeroProcesso: values.numeroProcesso,
      comarca: values.comarca,
      grau: values.grau,
      dateFrom: values.dateFrom,
      dateTo: values.dateTo,
    };
  }

  function applyFavorito(params: Record<string, string>) {
    if (params.keyword) setValue('keyword', params.keyword);
    if (params.numeroProcesso) setValue('numeroProcesso', params.numeroProcesso);
    if (params.comarca) setValue('comarca', params.comarca);
    if (params.grau) setValue('grau', params.grau);
    if (params.dateFrom) setValue('dateFrom', params.dateFrom);
    if (params.dateTo) setValue('dateTo', params.dateTo);
    void executeSearch(getValues(), 1);
  }

  const isLoading = searchState.status === 'loading';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buscar Processos — DataJud</h1>
          <p className="mt-1 text-sm text-gray-500">
            Busque processos da 1ª instância do TJSP via DataJud/CNJ.
          </p>
        </div>
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

      {/* Favoritos */}
      <BuscaFavoritos fonte="datajud" onAplicar={applyFavorito} />

      <form
        onSubmit={handleSubmit((values) => executeSearch(values, 1))}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
        noValidate
      >
        <div>
          <label htmlFor="numeroProcesso" className="block text-sm font-medium text-gray-700 mb-1">
            Número do processo <span className="text-gray-400 font-normal">(CNJ)</span>
          </label>
          <div className="relative">
            <input
              id="numeroProcesso"
              type="text"
              placeholder="Ex: 0001234-56.2023.8.26.0001"
              {...register('numeroProcesso')}
              disabled={isLoading}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 font-mono"
            />
            {byNumero && !isLoading && (
              <button
                type="button"
                onClick={() => setValue('numeroProcesso', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Limpar número do processo"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">ou busque por assunto</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <fieldset disabled={byNumero || isLoading} className={byNumero ? 'opacity-40 pointer-events-none' : ''}>
          {byNumero && (
            <p className="text-xs text-blue-600 mb-3">
              Buscando por número — os filtros abaixo são ignorados.
            </p>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
                Palavra-chave
              </label>
              <input
                id="keyword"
                type="text"
                placeholder="Ex: Alimentos, Divórcio, Indenização"
                {...register('keyword')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              {errors.keyword && !byNumero && (
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
              <label htmlFor="comarca" className="block text-sm font-medium text-gray-700 mb-1">
                Comarca / Cidade <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="comarca"
                type="text"
                placeholder="Ex: Campinas, Santos, Ribeirão Preto"
                {...register('comarca')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                  Distribuído a partir de
                </label>
                <input
                  id="dateFrom"
                  type="date"
                  {...register('dateFrom')}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </fieldset>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            data-testid="search-button"
            className="flex-1 flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
          {searchState.status === 'success' && (
            <BotaoSalvarFavorito fonte="datajud" getData={getCurrentFavoritoData} />
          )}
        </div>
      </form>

      {searchState.status === 'error' && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {searchState.message}
        </div>
      )}

      {searchState.status === 'success' && (
        <div ref={resultsRef} className="space-y-4 scroll-mt-4">
          <p className="text-sm text-gray-600">
            {searchState.data.total === 0
              ? `Nenhum processo encontrado para "${searchState.label}".`
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
                <div key={p.numero} className="relative">
                  <ProcessoCard processo={p} />
                  <div className="px-4 pb-3">
                    <BotaoAdicionarCRM numeroCnj={p.numero} tribunal="TJSP" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            page={searchState.data.page}
            totalPages={searchState.data.totalPages}
            disabled={isLoading}
            onPage={handlePage}
          />
        </div>
      )}
    </div>
  );
}

// ── Botão inline para salvar favorito ────────────────────────────────────────

interface BotaoSalvarFavoritoProps {
  fonte: string;
  getData: () => Record<string, string | undefined>;
}

function BotaoSalvarFavorito({ fonte, getData }: BotaoSalvarFavoritoProps) {
  const [saved, setSaved] = useState(false);

  function handleSalvar() {
    const data = getData();
    const nome = prompt('Nome para salvar este favorito:');
    if (!nome) return;
    const key = `favoritos_${fonte}`;
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ id: string; nome: string; params: Record<string, string | undefined> }>;
    existing.unshift({ id: crypto.randomUUID(), nome, params: data });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleSalvar}
      data-testid="btn-salvar-favorito"
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
    >
      {saved ? '✓ Salvo!' : '★ Salvar busca'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BuscaDataJudPage() {
  return (
    <Suspense>
      <DataJudSearchContent />
    </Suspense>
  );
}
