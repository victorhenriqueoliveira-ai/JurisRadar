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

const TERMOS_REFERENCIA = [
  {
    categoria: 'Criminal',
    cor: 'bg-red-50 border-red-200',
    corCategoria: 'text-red-700',
    termos: [
      { termo: 'Homicídio Doloso', descricao: 'Homicídio intencional' },
      { termo: 'Homicídio Culposo', descricao: 'Homicídio por negligência/imprudência' },
      { termo: 'Roubo', descricao: 'Subtração com violência ou ameaça' },
      { termo: 'Furto', descricao: 'Subtração sem violência' },
      { termo: 'Tráfico', descricao: 'Tráfico de drogas' },
      { termo: 'Lesão Corporal', descricao: 'Agressão física' },
      { termo: 'Estupro', descricao: 'Crimes sexuais' },
      { termo: 'Violência Doméstica', descricao: 'Lei Maria da Penha' },
      { termo: 'Ameaça', descricao: 'Crime de ameaça' },
      { termo: 'Desacato', descricao: 'Desacato a funcionário público' },
    ],
  },
  {
    categoria: 'Família',
    cor: 'bg-purple-50 border-purple-200',
    corCategoria: 'text-purple-700',
    termos: [
      { termo: 'Alimentos', descricao: 'Pensão alimentícia' },
      { termo: 'Divórcio', descricao: 'Dissolução do casamento' },
      { termo: 'Guarda', descricao: 'Guarda de filhos' },
      { termo: 'Adoção', descricao: 'Adoção de menores' },
      { termo: 'Pensão', descricao: 'Pensão por morte / alimentos' },
      { termo: 'Partilha', descricao: 'Divisão de bens' },
    ],
  },
  {
    categoria: 'Cível',
    cor: 'bg-blue-50 border-blue-200',
    corCategoria: 'text-blue-700',
    termos: [
      { termo: 'Indenização', descricao: 'Dano moral ou material' },
      { termo: 'Rescisão', descricao: 'Rescisão de contrato' },
      { termo: 'Cobrança', descricao: 'Cobrança de dívida' },
      { termo: 'Locação', descricao: 'Aluguel / despejo' },
      { termo: 'Empréstimo', descricao: 'Dívidas bancárias / empréstimo' },
      { termo: 'Acidente de Trânsito', descricao: 'Colisão / danos em acidente' },
      { termo: 'Usucapião', descricao: 'Aquisição de propriedade por posse' },
      { termo: 'Inventário', descricao: 'Herança e espólio' },
      { termo: 'Multa de Trânsito', descricao: 'Contestação de multas' },
    ],
  },
  {
    categoria: 'Previdenciário',
    cor: 'bg-green-50 border-green-200',
    corCategoria: 'text-green-700',
    termos: [
      { termo: 'Aposentadoria', descricao: 'Benefícios previdenciários' },
      { termo: 'Execução Fiscal', descricao: 'Cobranças do fisco / dívida ativa' },
    ],
  },
];

export default function DataJudSearchPage() {
  const searchParams = useSearchParams();
  const [showGuia, setShowGuia] = useState(false);

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

      {/* Guia de termos */}
      <div className="rounded-md border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowGuia((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>Guia de termos — como pesquisar por tipo de caso</span>
          <span className="text-gray-400">{showGuia ? '▲' : '▼'}</span>
        </button>

        {showGuia && (
          <div className="border-t border-gray-200 p-4 space-y-5">
            {TERMOS_REFERENCIA.map((cat) => (
              <div key={cat.categoria}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${cat.corCategoria}`}>
                  {cat.categoria}
                </p>
                <div className={`rounded-md border ${cat.cor} overflow-hidden`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-1/3">Termo de busca</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Quando usar</th>
                        <th className="px-3 py-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.termos.map((t, i) => (
                        <tr key={t.termo} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-gray-900">{t.termo}</td>
                          <td className="px-3 py-2 text-gray-600">{t.descricao}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => { setValue('keyword', t.termo); setShowGuia(false); }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Usar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
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
