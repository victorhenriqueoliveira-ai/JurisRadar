'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import PublicationCard, { Publication } from '@/components/dje/PublicationCard';
import SetupModal from '@/components/dje/SetupModal';

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

function ComoFunciona() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>Como funciona esta busca?</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-200 p-4 space-y-4 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-gray-900 mb-1">O que é o DJE?</p>
            <p>
              O DJE (Diário da Justiça Eletrônico) é o veículo oficial de publicações do TJSP. Toda
              intimação, despacho ou decisão que precisa ser comunicada às partes é publicada aqui.
              O JurisRadar indexa diariamente os <strong>Cadernos 2 e 3</strong> (2ª e 1ª Instância
              da Capital).
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-1">Por que os dados não são em tempo real?</p>
            <p>
              O TJSP publica o DJE uma vez por dia útil, geralmente no final da tarde. O JurisRadar
              baixa, extrai e indexa o diário automaticamente às <strong>20h (horário de Brasília)</strong>,
              após confirmar que a edição do dia está disponível.
            </p>
            <p className="mt-2">
              Isso significa que uma publicação de hoje estará disponível aqui a partir das
              aproximadamente <strong>20h30</strong>. Fins de semana e feriados não têm edição.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-1">Como o pipeline de indexação funciona?</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Download do PDF do caderno no portal DJE/TJSP</li>
              <li>Extração do texto do PDF</li>
              <li>Segmentação das publicações pelo número CNJ de cada processo</li>
              <li>Armazenamento no banco de dados com índice de busca full-text</li>
            </ol>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-1">O que é coberto?</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Caderno 2</strong> — Judicial, 2ª Instância</li>
              <li><strong>Caderno 3</strong> — Judicial, 1ª Instância Capital (Parte I)</li>
            </ul>
            <p className="mt-2 text-gray-500">
              Interior do estado e outros tribunais não são cobertos nesta versão.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-1">Cobertura histórica</p>
            <p>
              Só há publicações indexadas a partir da data em que o JurisRadar entrou em operação.
              Para períodos anteriores, a busca não retornará resultados — use diretamente o portal
              do DJE/TJSP para consultas históricas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DjePageContent() {
  const searchParams = useSearchParams();
  const searchId = searchParams.get('searchId');

  const [searchState, setSearchState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: SearchResult }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  // Ao receber ?searchId, carrega resultados da busca salva automaticamente
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

  const isLoading = searchState.status === 'loading';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SetupModal />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Publicações DJE</h1>
        <p className="mt-1 text-sm text-gray-500">Pesquise publicações do Diário da Justiça Eletrônico do TJSP.</p>
      </div>

      <ComoFunciona />

      {/* Aviso de cobertura — sempre visível */}
      <div
        role="note"
        className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
        data-testid="coverage-notice"
      >
        Resultados provenientes do DJE/TJSP — Cadernos 2 e 3 (Capital). Interior e outros tribunais não cobertos.
      </div>

      {/* Formulário de busca */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="search-button"
        >
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Área de resultados */}
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
                Tente ampliar o período ou usar um termo diferente. Se o período for muito recente, pode ser que o índice ainda não tenha sido populado.
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

export default function DjePage() {
  return (
    <Suspense>
      <DjePageContent />
    </Suspense>
  );
}
