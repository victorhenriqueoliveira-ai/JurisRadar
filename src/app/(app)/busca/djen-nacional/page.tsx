'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import BuscaFavoritos from '@/components/busca/BuscaFavoritos';

const formSchema = z.object({
  numeroProcesso: z.string().optional(),
  texto: z.string().optional(),
  nomeParte: z.string().optional(),
  data: z.string().optional(),
  tipoComunicacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
  | { status: 'success'; items: DjenItem[]; total: number; page: number; totalPages: number; searchTerms: string[] }
  | { status: 'error'; message: string };

const LIMIT = 20;

const TIPOS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'D', label: 'Despacho' },
  { value: 'S', label: 'Sentença' },
  { value: 'A', label: 'Acórdão' },
  { value: 'I', label: 'Intimação' },
];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function highlight(text: string, terms: string[]): React.ReactNode {
  const valid = terms.map((t) => t.trim()).filter(Boolean);
  if (!valid.length) return text;
  const escaped = valid.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 not-italic">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(raw: any): DjenItem {
  return {
    id: raw.id,
    data: raw.dataDisponibilizacao ?? raw.data_disponibilizacao ?? '',
    tipo: raw.tipoComunicacao ?? '',
    orgao: raw.nomeOrgao ?? '',
    classe: raw.nomeClasse ?? '',
    numeroProcesso: raw.numeroprocessocommascara ?? raw.numero_processo ?? raw.numeroProcesso ?? '',
    partes: (raw.destinatarios ?? []).map((d: { nome?: string; polo?: string }) => ({ nome: d.nome, polo: d.polo })),
    link: raw.link ?? '',
    texto: raw.texto ?? '',
  };
}

type CrmState = 'idle' | 'loading' | 'added' | 'exists' | 'error';

function PublicacaoCard({ item, searchTerms = [] }: { item: DjenItem; searchTerms?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [crmState, setCrmState] = useState<CrmState>('idle');
  const plain = stripHtml(item.texto ?? '');
  const textoPlain = plain.slice(0, expanded ? 3000 : 300);

  async function handleAddCrm() {
    if (!item.numeroProcesso) return;
    setCrmState('loading');
    try {
      const res = await fetch('/api/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroCnj: item.numeroProcesso, tribunal: item.orgao ?? undefined }),
      });
      if (res.status === 200) setCrmState('exists');
      else if (res.status === 201) setCrmState('added');
      else setCrmState('error');
    } catch {
      setCrmState('error');
    }
  }

  const crmLabel = {
    idle: '+ CRM',
    loading: '…',
    added: '✓ Adicionado',
    exists: '✓ Já no CRM',
    error: 'Erro',
  }[crmState];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {item.tipo && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              {item.tipo}
            </span>
          )}
          {item.data && <span className="text-xs text-gray-500">{formatDate(item.data)}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.numeroProcesso && (
            <button
              type="button"
              onClick={handleAddCrm}
              disabled={crmState === 'loading' || crmState === 'added' || crmState === 'exists'}
              className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
                crmState === 'added' || crmState === 'exists'
                  ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                  : crmState === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-[#0f2d5e]/5 text-[#0f2d5e] border-[#0f2d5e]/20 hover:bg-[#0f2d5e] hover:text-white'
              }`}
            >
              {crmLabel}
            </button>
          )}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline whitespace-nowrap">
              Ver ↗
            </a>
          )}
        </div>
      </div>

      {item.numeroProcesso && (
        <p className="text-sm font-bold text-gray-900 font-mono tracking-tight">{item.numeroProcesso}</p>
      )}
      {item.orgao && <p className="text-xs text-gray-600">{highlight(item.orgao, searchTerms)}</p>}
      {item.classe && <p className="text-xs text-gray-500 italic">{item.classe}</p>}

      {item.partes && item.partes.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {item.partes.map((p, i) => (
            <span key={i} className="text-xs text-gray-700">
              {p.polo && <span className="text-gray-400 uppercase mr-1 font-medium">{p.polo}</span>}
              {p.nome}
            </span>
          ))}
        </div>
      )}

      {plain && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed">
            {highlight(textoPlain, searchTerms)}
            {!expanded && plain.length > 300 && '…'}
          </p>
          {plain.length > 300 && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs text-blue-600 hover:underline">
              {expanded ? 'Recolher' : 'Ver mais'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DjenNacionalBuscaContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<BuscaState>({ status: 'idle' });
  const [favoritoSalvo, setFavoritoSalvo] = useState(false);

  const { register, handleSubmit, getValues, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { numeroProcesso: '', texto: '', nomeParte: '', data: '', tipoComunicacao: '' },
  });

  const byNumero = Boolean(watch('numeroProcesso')?.trim());
  const isLoading = state.status === 'loading';

  useEffect(() => {
    const np = searchParams.get('numeroProcesso');
    const texto = searchParams.get('texto');
    const nomeParte = searchParams.get('nomeParte');
    const data = searchParams.get('data');
    const tipo = searchParams.get('tipoComunicacao');
    if (!np && !texto) return;
    if (np) setValue('numeroProcesso', np);
    if (texto) setValue('texto', texto);
    if (nomeParte) setValue('nomeParte', nomeParte);
    if (data) setValue('data', data);
    if (tipo) setValue('tipoComunicacao', tipo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPage(values: FormValues, offset: number, loteSize = LIMIT) {
    const params = new URLSearchParams({
      siglaTribunal: 'TJSP',
      limit: String(loteSize),
      offset: String(offset),
    });
    if (values.numeroProcesso?.trim()) params.set('numeroProcesso', values.numeroProcesso);
    else {
      if (values.texto || values.nomeParte) {
        // Combina os termos na query para aproveitar o índice full-text da API
        const partes = [values.texto, values.nomeParte].filter(Boolean);
        params.set('texto', partes.join(' '));
      }
      if (values.data) params.set('dataDisponibilizacao', values.data);
    }
    if (values.tipoComunicacao) params.set('tipoComunicacao', values.tipoComunicacao);

    const res = await fetch(`/api/djen/searches?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      throw new Error(err?.error ?? `Erro ${res.status}`);
    }
    return res.json() as Promise<{ items?: unknown[]; count?: number }>;
  }

  async function search(values: FormValues, page = 1) {
    setState({ status: 'loading' });
    try {
      const termoPrincipal = values.texto?.trim().toLowerCase();
      const filtroAdicional = values.nomeParte?.trim().toLowerCase();
      const temFiltroAdicional = !values.numeroProcesso?.trim() && !!filtroAdicional;
      let items: DjenItem[];
      let total: number;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function passaFiltros(r: any): boolean {
        const plain = stripHtml(String(r.texto ?? '')).toLowerCase();
        const orgao = String(r.nomeOrgao ?? '').toLowerCase();
        // termo principal: aceita se aparece no texto OU no orgao (comarca)
        const passaPrincipal = termoPrincipal
          ? plain.includes(termoPrincipal) || orgao.includes(termoPrincipal)
          : true;
        const passaAdicional = filtroAdicional ? plain.includes(filtroAdicional) : true;
        return passaPrincipal && passaAdicional;
      }

      if (temFiltroAdicional) {
        const lotes = await Promise.all([0, 100, 200, 300, 400].map((off) => fetchPage(values, off, 100)));
        total = (lotes[0] as { count?: number }).count ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = lotes.flatMap((d: any) => d.items ?? []);
        items = raw.filter(passaFiltros).map(mapItem);
      } else {
        const offset = (page - 1) * LIMIT;
        const data = await fetchPage(values, offset);
        total = data.count ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items = (data.items ?? [] as any[]).filter(passaFiltros).map(mapItem);
      }

      const totalPages = Math.max(1, Math.ceil(total / LIMIT));
      const searchTerms = [values.texto, values.nomeParte].filter(Boolean) as string[];
      setState({ status: 'success', items, total, page, totalPages, searchTerms });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  }

  async function handlePage(page: number) {
    await search(getValues(), page);
  }

  function handleSalvarFavorito() {
    const values = getValues();
    const nome = prompt('Nome para salvar esta busca:');
    if (!nome) return;
    const key = 'favoritos_djen';
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ id: string; nome: string; params: Record<string, string> }>;
    existing.unshift({
      id: crypto.randomUUID(),
      nome,
      params: {
        ...(values.numeroProcesso ? { numeroProcesso: values.numeroProcesso } : {}),
        ...(values.texto ? { texto: values.texto } : {}),
        ...(values.nomeParte ? { nomeParte: values.nomeParte } : {}),
        ...(values.data ? { data: values.data } : {}),
        ...(values.tipoComunicacao ? { tipoComunicacao: values.tipoComunicacao } : {}),
      },
    });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
    setFavoritoSalvo(true);
    setTimeout(() => setFavoritoSalvo(false), 2000);
  }

  function applyFavorito(params: Record<string, string>) {
    if (params.numeroProcesso) setValue('numeroProcesso', params.numeroProcesso);
    if (params.texto) setValue('texto', params.texto);
    if (params.nomeParte) setValue('nomeParte', params.nomeParte);
    if (params.data) setValue('data', params.data);
    if (params.tipoComunicacao) setValue('tipoComunicacao', params.tipoComunicacao);
    void search(getValues(), 1);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">DJEN Nacional — Diário da Justiça Eletrônico Nacional</p>
        <p>Publicações de todos os tribunais do Brasil. <strong>Delay de 1 dia útil</strong> — publicações aparecem no dia seguinte à disponibilização.</p>
        <p>Use termos específicos: nome da parte, número do processo, bairro, endereço.</p>
      </div>

      <BuscaFavoritos fonte="djen" onAplicar={applyFavorito} />

      <form
        onSubmit={handleSubmit((v) => search(v, 1))}
        className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm"
        noValidate
      >
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

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 shrink-0">ou busque por termos</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

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
          <p className="mt-1 text-xs text-gray-500">Use o termo mais específico aqui — bairro, nome, endereço.</p>
        </div>

        <div>
          <label htmlFor="nomeParte" className="block text-sm font-medium text-gray-700 mb-1">
            Filtro adicional no texto <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="nomeParte"
            type="text"
            placeholder="Ex: busca e apreensão, alimentos, divórcio"
            {...register('nomeParte')}
            disabled={isLoading || byNumero}
            className={inputCls}
          />
        </div>

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
          </div>
          <div>
            <label htmlFor="tipoComunicacao" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select id="tipoComunicacao" {...register('tipoComunicacao')} disabled={isLoading || byNumero} className={inputCls}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            {isLoading ? 'Buscando…' : 'Buscar no DJEN'}
          </button>
          {state.status === 'success' && (
            <button
              type="button"
              onClick={handleSalvarFavorito}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {favoritoSalvo ? '✓ Salvo!' : '★ Salvar busca'}
            </button>
          )}
        </div>
      </form>

      {state.status === 'error' && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

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
              <PublicacaoCard key={item.id ?? idx} item={item} searchTerms={state.searchTerms} />
            ))}
          </div>

          {state.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handlePage(state.page - 1)}
                disabled={state.page <= 1 || isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">{state.page} / {state.totalPages}</span>
              <button
                type="button"
                onClick={() => handlePage(state.page + 1)}
                disabled={state.page >= state.totalPages || isLoading}
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

export default function DjenNacionalBuscaPage() {
  return (
    <Suspense>
      <DjenNacionalBuscaContent />
    </Suspense>
  );
}
