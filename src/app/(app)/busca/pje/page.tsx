'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import BuscaFavoritos from '@/components/busca/BuscaFavoritos';

const formSchema = z.object({
  termo: z.string().min(2, 'Mínimo 2 caracteres'),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  nomeParte: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DjenPublication {
  id: string;
  numeroCnj?: string;
  texto: string;
  data: string;
  tribunal?: string;
}

interface SearchResult {
  results: DjenPublication[];
  total: number;
  page: number;
  totalPages: number;
}

const LIMIT = 50;

function PjePageContent() {
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
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function executeSearch(values: FormValues, page: number) {
    setSearchState({ status: 'loading' });
    try {
      // Chama o DJEN via API do browser (evita bloqueio de IP no servidor)
      const params = new URLSearchParams({
        q: values.termo,
        page: String(page),
        limit: String(LIMIT),
        ...(values.dataInicio ? { dataInicio: values.dataInicio } : {}),
        ...(values.dataFim ? { dataFim: values.dataFim } : {}),
        ...(values.nomeParte ? { nomeParte: values.nomeParte } : {}),
      });

      const response = await fetch(`/api/djen/searches?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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

  function handleSalvarFavorito() {
    const values = getValues();
    const nome = prompt('Nome para salvar este favorito:');
    if (!nome) return;
    const key = 'favoritos_pje';
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ id: string; nome: string; params: Record<string, string> }>;
    const params: Record<string, string> = { termo: values.termo };
    if (values.dataInicio) params.dataInicio = values.dataInicio;
    if (values.dataFim) params.dataFim = values.dataFim;
    if (values.nomeParte) params.nomeParte = values.nomeParte;
    existing.unshift({ id: crypto.randomUUID(), nome, params });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
    setFavoritoSalvo(true);
    setTimeout(() => setFavoritoSalvo(false), 2000);
  }

  function applyFavorito(params: Record<string, string>) {
    if (params.termo) setValue('termo', params.termo);
    if (params.dataInicio) setValue('dataInicio', params.dataInicio);
    if (params.dataFim) setValue('dataFim', params.dataFim);
    if (params.nomeParte) setValue('nomeParte', params.nomeParte);
    void executeSearch(getValues(), 1);
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
    <div className="space-y-6 p-6">
      <BuscaFavoritos fonte="pje" onAplicar={applyFavorito} />

      <div
        role="note"
        className="rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800 space-y-1 p-4"
      >
        <p className="font-semibold">PJe Nacional — Processo Judicial Eletrônico</p>
        <p><strong>Delay de 1 a 3 dias úteis</strong> — publicações são indexadas após processamento pelo CNJ.</p>
        <p>Cobertura varia por tribunal. Busca publicações em todos os tribunais que usam o sistema PJe.</p>
      </div>

      <form
        onSubmit={handleSubmit((values) => executeSearch(values, 1))}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
        noValidate
      >
        <div>
          <label htmlFor="termo" className="block text-sm font-medium text-gray-700 mb-1">
            Termo de busca
          </label>
          <input
            id="termo"
            type="text"
            placeholder="Ex: rescisão contratual, dano moral"
            {...register('termo')}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          {errors.termo && (
            <p role="alert" className="mt-1 text-xs text-red-600">{errors.termo.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="nomeParte" className="block text-sm font-medium text-gray-700 mb-1">
            Nome da parte <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="nomeParte"
            type="text"
            placeholder="Ex: João da Silva"
            {...register('nomeParte')}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
              Data inicial <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="dataInicio"
              type="date"
              {...register('dataInicio')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">
              Data final <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="dataFim"
              type="date"
              {...register('dataFim')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

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
              <p className="mt-1 text-xs text-gray-500">Tente ampliar o período ou usar um termo diferente.</p>
            </div>
          )}

          {searchState.data.results.length > 0 && (
            <div className="space-y-3">
              {searchState.data.results.map((pub) => (
                <div key={pub.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {pub.tribunal && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                          {pub.tribunal}
                        </span>
                      )}
                      {pub.numeroCnj && (
                        <span className="text-xs font-mono text-gray-600">{pub.numeroCnj}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{pub.data}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-4">{pub.texto}</p>
                </div>
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

export default function BuscaPjePage() {
  return (
    <Suspense>
      <PjePageContent />
    </Suspense>
  );
}
