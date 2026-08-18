'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';

interface Parte {
  nome: string;
  polo: string;
}

interface Advogado {
  advogado?: { nome?: string; numeroOab?: string };
}

interface DjenItem {
  id: number;
  data: string;
  tipo: string;
  orgao: string;
  classe: string;
  numeroProcesso: string;
  partes: Parte[];
  advogados: Advogado[];
  link: string;
  texto: string;
}

interface FormValues {
  texto: string;
  nomeParte: string;
  numeroProcesso: string;
  dataInicio: string;
  dataFim: string;
  tipoComunicacao: string;
}

interface SearchState {
  status: 'idle' | 'loading' | 'success' | 'error';
  items?: DjenItem[];
  total?: number;
  offset?: number;
  error?: string;
}

const LIMIT = 20;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function ResultCard({ item }: { item: DjenItem }) {
  const [expanded, setExpanded] = useState(false);
  const partes = item.partes ?? [];
  const advs = item.advogados ?? [];
  const plain = stripHtml(item.texto ?? '');
  const textoPlain = plain.slice(0, expanded ? 3000 : 300);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 mr-2">
            {item.tipo}
          </span>
          <span className="text-xs text-gray-500">{item.data}</span>
        </div>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Ver no e-SAJ ↗
          </a>
        )}
      </div>

      {item.numeroProcesso && (
        <p className="text-sm font-mono font-semibold text-gray-900">{item.numeroProcesso}</p>
      )}

      <p className="text-xs text-gray-600">{item.orgao}</p>
      {item.classe && <p className="text-xs text-gray-500 italic">{item.classe}</p>}

      {partes.length > 0 && (
        <div className="text-xs text-gray-700 space-x-1">
          {partes.map((p, i) => (
            <span key={i}>
              <span className="text-gray-400 uppercase text-[10px] mr-1">
                {p.polo === 'A' ? 'Ativo' : p.polo === 'P' ? 'Passivo' : p.polo}
              </span>
              {p.nome}
              {i < partes.length - 1 && <span className="mx-2 text-gray-300">·</span>}
            </span>
          ))}
        </div>
      )}

      {advs.length > 0 && (
        <div className="text-xs text-gray-500">
          {advs.slice(0, 3).map((a, i) => (
            <span key={i}>
              {a.advogado?.nome}
              {a.advogado?.numeroOab && ` (OAB ${a.advogado.numeroOab})`}
              {i < Math.min(advs.length, 3) - 1 && <span className="mx-1">·</span>}
            </span>
          ))}
          {advs.length > 3 && <span className="text-gray-400"> +{advs.length - 3}</span>}
        </div>
      )}

      <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 leading-relaxed">
        {textoPlain}
        {!expanded && plain.length > 300 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="ml-1 text-blue-600 hover:underline"
          >
            ver mais ▼
          </button>
        )}
        {expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="ml-1 text-blue-600 hover:underline"
          >
            ver menos ▲
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50';

function DjenNacionalContent() {
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      texto: '',
      nomeParte: '',
      numeroProcesso: '',
      dataInicio: '',
      dataFim: '',
      tipoComunicacao: '',
    },
  });

  const byNumero = !!watch('numeroProcesso');

  async function search(values: FormValues, offset = 0) {
    setState({ status: 'loading' });

    // Chama a API do CNJ direto do browser (CORS: Access-Control-Allow-Origin: *)
    const params = new URLSearchParams({ siglaTribunal: 'TJSP', limit: String(LIMIT), offset: String(offset) });

    if (values.numeroProcesso) {
      params.set('numeroProcesso', values.numeroProcesso.replace(/[.\-]/g, ''));
    } else {
      const termos = [values.texto, values.nomeParte].filter(Boolean).join(' ');
      if (termos) params.set('texto', termos);
      if (values.dataInicio) params.set('dataDisponibilizacao', values.dataInicio);
    }
    if (values.tipoComunicacao) params.set('tipoComunicacao', values.tipoComunicacao);

    try {
      const res = await fetch(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?${params}`);
      if (!res.ok) throw new Error(`DJEN retornou ${res.status}`);
      const data = await res.json();

      let items: Record<string, unknown>[] = data.items ?? [];

      // Filtro local por data fim (API só aceita uma data)
      if (values.dataFim && values.dataInicio && values.dataInicio !== values.dataFim) {
        items = items.filter((item) => {
          const d = String(item.data_disponibilizacao ?? '');
          return d >= values.dataInicio && d <= values.dataFim;
        });
      }

      setState({
        status: 'success',
        total: data.count ?? 0,
        offset,
        items: items.map((item) => ({
          id: item.id as number,
          data: item.data_disponibilizacao as string,
          tipo: item.tipoComunicacao as string,
          orgao: item.nomeOrgao as string,
          classe: item.nomeClasse as string,
          numeroProcesso: (item.numeroprocessocommascara ?? item.numero_processo) as string,
          partes: (item.destinatarios ?? []) as Parte[],
          advogados: (item.destinatarioadvogados ?? []) as Advogado[],
          link: item.link as string,
          texto: item.texto as string,
        })),
      });
    } catch (e) {
      setState({ status: 'error', error: e instanceof Error ? e.message : 'Erro desconhecido' });
    }
  }

  const isLoading = state.status === 'loading';
  const page = state.offset !== undefined ? Math.floor(state.offset / LIMIT) + 1 : 1;
  const totalPages = state.total ? Math.ceil(Math.min(state.total, 10000) / LIMIT) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Publicações DJEN</h1>
        <p className="mt-1 text-sm text-gray-500">
          Diário de Justiça Eletrônico Nacional — publicações do TJSP em tempo real via API do CNJ.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((v) => search(v, 0))}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
        noValidate
      >
        {/* Número do processo */}
        <div>
          <label htmlFor="numeroProcesso" className="block text-sm font-medium text-gray-700 mb-1">
            Número do processo <span className="text-gray-400 font-normal">(CNJ)</span>
          </label>
          <input
            id="numeroProcesso"
            type="text"
            placeholder="Ex: 1501260-42.2024.8.26.0052"
            {...register('numeroProcesso')}
            disabled={isLoading}
            className={inputCls}
          />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400 flex-shrink-0">ou busque por termos</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Termo livre */}
        <div>
          <label htmlFor="texto" className="block text-sm font-medium text-gray-700 mb-1">
            Termo de busca
          </label>
          <input
            id="texto"
            type="text"
            placeholder="Ex: busca e apreensão capão redondo, avenida paulista"
            {...register('texto')}
            disabled={isLoading || byNumero}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">
            Busca no texto completo — endereço, bairro, tipo de ação, qualquer conteúdo da publicação.
          </p>
        </div>

        {/* Nome da parte */}
        <div>
          <label htmlFor="nomeParte" className="block text-sm font-medium text-gray-700 mb-1">
            Nome da parte
          </label>
          <input
            id="nomeParte"
            type="text"
            placeholder="Ex: Banco Bradesco, João da Silva"
            {...register('nomeParte')}
            disabled={isLoading || byNumero}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">
            Combinado com o termo de busca — restringe às publicações que mencionam essa parte.
          </p>
        </div>

        {/* Datas + Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
              Data inicial
            </label>
            <input
              id="dataInicio"
              type="date"
              {...register('dataInicio')}
              disabled={isLoading}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">
              Data final
            </label>
            <input
              id="dataFim"
              type="date"
              {...register('dataFim')}
              disabled={isLoading}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="tipoComunicacao" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              id="tipoComunicacao"
              {...register('tipoComunicacao')}
              disabled={isLoading}
              className={inputCls}
            >
              <option value="">Todos os tipos</option>
              <option value="Intimação">Intimação</option>
              <option value="Citação">Citação</option>
              <option value="Edital">Edital</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Buscando...' : 'Buscar no DJEN'}
        </button>
      </form>

      {state.status === 'error' && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.status === 'success' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {state.total === 0
              ? 'Nenhuma publicação encontrada.'
              : `${state.total?.toLocaleString('pt-BR')} publicação${state.total !== 1 ? 'ões' : ''} encontrada${state.total !== 1 ? 's' : ''}`}
            {totalPages > 1 && ` — página ${page} de ${totalPages}`}
          </p>

          {(state.items ?? []).length === 0 && (
            <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-900">Nenhuma publicação encontrada.</p>
              <p className="mt-1 text-xs text-gray-500">Tente outro termo ou outra data.</p>
            </div>
          )}

          <div className="space-y-3">
            {(state.items ?? []).map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleSubmit((v) => search(v, (state.offset ?? 0) - LIMIT))()}
                disabled={page <= 1 || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => handleSubmit((v) => search(v, (state.offset ?? 0) + LIMIT))()}
                disabled={page >= totalPages || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DjenNacionalPage() {
  return (
    <Suspense>
      <DjenNacionalContent />
    </Suspense>
  );
}
