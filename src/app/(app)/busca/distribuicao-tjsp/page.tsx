'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import DistribuicaoTjspIaChat from '@/components/busca/DistribuicaoTjspIaChat';

const formSchema = z
  .object({
    comarca: z.string().optional(),
    classe: z.string().optional(),
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida'),
    dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida'),
  })
  .refine((d) => new Date(d.dataFim) >= new Date(d.dataInicio), {
    message: 'Data final deve ser maior ou igual à data inicial',
    path: ['dataFim'],
  });

type FormValues = z.infer<typeof formSchema>;

interface ProcessoNovo {
  id: string;
  numeroProcesso: string;
  comarca: string | null;
  vara: string | null;
  classe: string;
  dataDistribuicao: string;
  linkEproc: string;
}

interface SearchResult {
  results: ProcessoNovo[];
  total: number;
  page: number;
  totalPages: number;
  diasNaoIndexados: string[];
}

const LIMIT = 25;

/** Classes mais comuns para prospecção — usado como sugestão inicial até carregar as reais do banco. */
const CLASSES_SUGERIDAS_PADRAO = [
  'Busca e Apreensão em Alienação Fiduciária',
  'Execução de Título Extrajudicial',
  'Usucapião',
  'Inventário',
  'Divórcio',
  'Procedimento Comum Cível',
];

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

function DistribuicaoTjspPageContent() {
  const [searchState, setSearchState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: SearchResult }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const [comarcasSugeridas, setComarcasSugeridas] = useState<string[]>([]);
  const [classesSugeridas, setClassesSugeridas] = useState<string[]>(CLASSES_SUGERIDAS_PADRAO);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comarca: '',
      classe: '',
      dataInicio: daysAgoIso(30),
      dataFim: todayIso(),
    },
  });

  useEffect(() => {
    fetch('/api/busca/distribuicao-tjsp/filtros')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { comarcas?: string[]; classes?: string[] } | null) => {
        if (data?.comarcas) setComarcasSugeridas(data.comarcas);
        if (data?.classes && data.classes.length > 0) setClassesSugeridas(data.classes);
      })
      .catch(() => {});
  }, []);

  async function executeSearch(values: FormValues, page: number) {
    setSearchState({ status: 'loading' });
    try {
      const params = new URLSearchParams({
        dataInicio: values.dataInicio,
        dataFim: values.dataFim,
        page: String(page),
        limit: String(LIMIT),
      });
      if (values.comarca?.trim()) params.set('comarca', values.comarca.trim());
      if (values.classe?.trim()) params.set('classe', values.classe.trim());

      const response = await fetch(`/api/busca/distribuicao-tjsp?${params.toString()}`);
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
    <div className="space-y-6 p-6">
      <div
        role="note"
        className="rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800 space-y-1 p-4"
      >
        <p className="font-semibold">Processos Novos — Lista de Distribuição TJSP (eproc, 1ª Instância)</p>
        <p>
          Processos recém-distribuídos em <strong>todas as comarcas</strong>, independente de quem é o advogado —
          ideal para prospectar clientes novos antes da concorrência.
        </p>
        <p>
          Não traz nome das partes (sigilo da distribuição inicial). Use o botão <strong>&quot;Ver no eproc&quot;</strong>{' '}
          em cada resultado pra consultar os detalhes do processo direto no sistema do TJSP.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((values) => executeSearch(values, 1))}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
        noValidate
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="comarca" className="block text-sm font-medium text-gray-700 mb-1">
              Comarca / Foro
            </label>
            <input
              id="comarca"
              type="text"
              list="comarcas-sugeridas"
              placeholder="Ex: Santo Amaro, Campinas..."
              {...register('comarca')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <datalist id="comarcas-sugeridas">
              {comarcasSugeridas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="classe" className="block text-sm font-medium text-gray-700 mb-1">
              Classe processual
            </label>
            <input
              id="classe"
              type="text"
              list="classes-sugeridas"
              placeholder="Ex: Busca e Apreensão, Usucapião..."
              {...register('classe')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <datalist id="classes-sugeridas">
              {classesSugeridas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
              Distribuído a partir de
            </label>
            <input
              id="dataInicio"
              type="date"
              {...register('dataInicio')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            {errors.dataInicio && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.dataInicio.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">
              Distribuído até
            </label>
            <input
              id="dataFim"
              type="date"
              {...register('dataFim')}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            {errors.dataFim && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.dataFim.message}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Buscando (datas novas podem levar alguns segundos a mais)...' : 'Buscar processos novos'}
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
              ? 'Nenhum processo encontrado.'
              : `${searchState.data.total} processo${searchState.data.total !== 1 ? 's' : ''} encontrado${searchState.data.total !== 1 ? 's' : ''}`}
            {searchState.data.totalPages > 1 && ` — página ${searchState.data.page} de ${searchState.data.totalPages}`}
          </p>

          {searchState.data.diasNaoIndexados.length > 0 && (
            <div role="note" className="rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800 px-4 py-3">
              <strong>{searchState.data.diasNaoIndexados.length} dia(s)</strong> do período pedido são de um range muito
              grande pra processar na hora e ainda não foram indexados — serão pegos no próximo job automático (roda
              todo dia de madrugada). Resultado acima pode estar incompleto para esses dias.
            </div>
          )}

          {searchState.data.results.length === 0 && (
            <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-900">Nenhum processo encontrado para os filtros informados.</p>
              <p className="mt-1 text-xs text-gray-500">
                Tente ampliar o período ou usar um termo de comarca/classe diferente.
              </p>
            </div>
          )}

          {searchState.data.results.length > 0 && (
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Data</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Nº Processo</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Comarca</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Vara</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Classe</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searchState.data.results.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {new Date(p.dataDistribuicao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-gray-900">{p.numeroProcesso}</td>
                      <td className="px-4 py-2 text-gray-700">{p.comarca ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{p.vara ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{p.classe}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <a
                          href={p.linkEproc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                        >
                          Ver no eproc ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {searchState.data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={searchState.data.page <= 1 || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

function BuscaDistribuicaoTjspModeSwitch() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  if (mode === 'ia') {
    return (
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6">
        <DistribuicaoTjspIaChat />
      </div>
    );
  }

  return <DistribuicaoTjspPageContent />;
}

export default function BuscaDistribuicaoTjspPage() {
  return (
    <Suspense>
      <BuscaDistribuicaoTjspModeSwitch />
    </Suspense>
  );
}
