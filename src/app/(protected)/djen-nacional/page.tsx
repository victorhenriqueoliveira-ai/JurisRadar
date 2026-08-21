'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// ── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  numeroProcesso: z.string().optional(),
  texto: z.string().optional(),
  nomeParte: z.string().optional(),
  data: z.string().optional(),
  tipoComunicacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Parte {
  nome?: string;
  polo?: string;
}

interface DjenItem {
  id: number;
  data: string;
  tipo: string;
  orgao: string;
  classe: string;
  numeroProcesso: string;
  partes: Parte[];
  link: string;
  texto: string;
}

type BuscaState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; items: DjenItem[]; total: number; page: number; totalPages: number }
  | { status: 'error'; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

// ── Card de publicação ────────────────────────────────────────────────────────

function PublicacaoCard({ item }: { item: DjenItem }) {
  const [expanded, setExpanded] = useState(false);
  const plain = stripHtml(item.texto ?? '');
  const textoPlain = plain.slice(0, expanded ? 3000 : 300);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-2">
      {/* Linha superior: tipo + data + link */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {item.tipo && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              {item.tipo}
            </span>
          )}
          {item.data && (
            <span className="text-xs text-gray-500">{formatDate(item.data)}</span>
          )}
        </div>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            Ver no e-SAJ ↗
          </a>
        )}
      </div>

      {/* Número do processo */}
      {item.numeroProcesso && (
        <p className="text-sm font-bold text-gray-900 font-mono tracking-tight">
          {item.numeroProcesso}
        </p>
      )}

      {/* Órgão */}
      {item.orgao && (
        <p className="text-xs text-gray-600">{item.orgao}</p>
      )}

      {/* Classe */}
      {item.classe && (
        <p className="text-xs text-gray-500 italic">{item.classe}</p>
      )}

      {/* Partes */}
      {item.partes && item.partes.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {item.partes.map((p, i) => (
            <span key={i} className="text-xs text-gray-700">
              {p.polo && (
                <span className="text-gray-400 uppercase mr-1 font-medium">{p.polo}</span>
              )}
              {p.nome}
            </span>
          ))}
        </div>
      )}

      {/* Texto da publicação */}
      {plain && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed">
            {textoPlain}
            {!expanded && plain.length > 300 && '…'}
          </p>
          {plain.length > 300 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              {expanded ? 'Recolher' : 'Ver mais'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Constantes ────────────────────────────────────────────────────────────────

const LIMIT = 20;
const BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

const TIPOS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'D', label: 'Despacho' },
  { value: 'S', label: 'Sentença' },
  { value: 'A', label: 'Acórdão' },
  { value: 'I', label: 'Intimação' },
];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50';

// ── Mapeamento da resposta da API ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(raw: any): DjenItem {
  return {
    id: raw.id,
    data: raw.dataDisponibilizacao ?? raw.data_disponibilizacao ?? '',
    tipo: raw.tipoComunicacao ?? '',
    orgao: raw.nomeOrgao ?? '',
    classe: raw.nomeClasse ?? '',
    numeroProcesso: raw.numeroprocessocommascara ?? raw.numero_processo ?? raw.numeroProcesso ?? '',
    partes: (raw.destinatarios ?? []).map((d: any) => ({ nome: d.nome, polo: d.polo })),
    link: raw.link ?? '',
    texto: raw.texto ?? '',
  };
}

// ── Componente principal ──────────────────────────────────────────────────────

function DjenNacionalContent() {
  const [state, setState] = useState<BuscaState>({ status: 'idle' });

  const { register, handleSubmit, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numeroProcesso: '',
      texto: '',
      nomeParte: '',
      data: '',
      tipoComunicacao: '',
    },
  });

  const numeroProcessoValue = watch('numeroProcesso');
  const byNumero = Boolean(numeroProcessoValue?.trim());
  const isLoading = state.status === 'loading';

  async function fetchPage(values: FormValues, offset: number, loteSize = LIMIT) {
    const params = new URLSearchParams({
      siglaTribunal: 'TJSP',
      limit: String(loteSize),
      offset: String(offset),
    });

    if (values.numeroProcesso?.trim()) {
      params.set('numeroProcesso', values.numeroProcesso.replace(/[.\-]/g, ''));
    } else {
      if (values.texto) params.set('texto', values.texto);
      if (values.data) params.set('dataDisponibilizacao', values.data);
    }
    if (values.tipoComunicacao) params.set('tipoComunicacao', values.tipoComunicacao);

    const res = await fetch(`${BASE}?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error(`DJEN retornou ${res.status}`);
    return res.json() as Promise<{ items?: unknown[]; count?: number }>;
  }

  async function search(values: FormValues, page = 1) {
    setState({ status: 'loading' });
    try {
      const temFiltroAdicional = !values.numeroProcesso?.trim() && !!values.nomeParte?.trim();

      let items: DjenItem[];
      let total: number;

      if (temFiltroAdicional) {
        const lotes = await Promise.all([0, 100, 200, 300, 400].map((off) => fetchPage(values, off, 100)));
        total = (lotes[0] as { count?: number }).count ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = lotes.flatMap((d: any) => d.items ?? []);
        const filtro = values.nomeParte!.trim().toLowerCase();
        items = raw
          .filter((r: unknown) => stripHtml(String((r as Record<string, unknown>).texto ?? '')).toLowerCase().includes(filtro))
          .map(mapItem);
      } else {
        const offset = (page - 1) * LIMIT;
        const data = await fetchPage(values, offset);
        total = data.count ?? 0;
        items = (data.items ?? []).map(mapItem);
      }

      const totalPages = Math.max(1, Math.ceil(total / LIMIT));
      setState({ status: 'success', items, total, page, totalPages });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Publicações DJEN</h1>
        <p className="mt-1 text-sm text-gray-500">
          Diário de Justiça Eletrônico Nacional — publicações do TJSP em tempo real via API do CNJ.
        </p>
      </div>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit((v) => search(v, 1))}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
        noValidate
      >
        {/* Número do processo */}
        <div>
          <label htmlFor="numeroProcesso" className="block text-sm font-medium text-gray-700 mb-1">
            Número do processo{' '}
            <span className="text-gray-400 font-normal">(CNJ)</span>
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

        {/* Divisor */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 shrink-0">ou busque por termos</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Busca principal */}
        <div>
          <label htmlFor="texto" className="block text-sm font-medium text-gray-700 mb-1">
            Busca principal
          </label>
          <input
            id="texto"
            type="text"
            placeholder="Ex: capão redondo, banco bradesco, avenida paulista"
            {...register('texto')}
            disabled={isLoading || byNumero}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">
            Use o termo <strong>mais específico</strong> aqui — bairro, nome da parte, endereço.
          </p>
        </div>

        {/* Filtro adicional */}
        <div>
          <label htmlFor="nomeParte" className="block text-sm font-medium text-gray-700 mb-1">
            Filtro adicional no texto{' '}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="nomeParte"
            type="text"
            placeholder="Ex: busca e apreensão, alimentos, divórcio"
            {...register('nomeParte')}
            disabled={isLoading || byNumero}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">
            Filtra os resultados da busca principal pelo conteúdo do texto da publicação.
          </p>
        </div>

        {/* Data + Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">
              Data de disponibilização
            </label>
            <input
              id="data"
              type="date"
              {...register('data')}
              disabled={isLoading || byNumero}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">Deixe em branco para buscar em todas as datas.</p>
          </div>

          <div>
            <label htmlFor="tipoComunicacao" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              id="tipoComunicacao"
              {...register('tipoComunicacao')}
              disabled={isLoading || byNumero}
              className={inputCls}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
        >
          {isLoading ? 'Buscando…' : 'Buscar no DJEN'}
        </button>
      </form>

      {/* Erro */}
      {state.status === 'error' && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Resultados */}
      {state.status === 'success' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {state.items.length === 0
              ? 'Nenhuma publicação encontrada.'
              : `${state.items.length.toLocaleString('pt-BR')} publicaç${state.items.length !== 1 ? 'ões' : 'ão'} encontrada${state.items.length !== 1 ? 's' : ''}`}
            {state.totalPages > 1 && ` — página ${state.page} de ${state.totalPages}`}
          </p>

          <div className="space-y-3">
            {state.items.map((item, idx) => (
              <PublicacaoCard key={item.id ?? idx} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DjenNacionalPage() {
  return <DjenNacionalContent />;
}
