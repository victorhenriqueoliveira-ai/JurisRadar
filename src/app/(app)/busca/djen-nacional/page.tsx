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
  tribunal: string;
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
  { value: 'Intimação', label: 'Intimação' },
  { value: 'Citação', label: 'Citação' },
  { value: 'Edital', label: 'Edital' },
];

// Credores/atores financeiros comuns nas publicações do DJEN
const CREDORES = [
  'Bradesco', 'Itaú', 'Santander', 'Caixa Econômica', 'Banco do Brasil',
  'BV', 'BMG', 'Banco Pan', 'Cetelem', 'Votorantim', 'Safra', 'Daycoval',
  'Omni', 'Portocred', 'Agibank', 'C6', 'Nubank', 'Inter', 'BTG',
  'Recover', 'Itapeva', 'Recovery', 'Losango', 'Creditas', 'Neon',
  'Sicredi', 'Sicoob', 'Banrisul', 'Mercado Crédito',
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
    tribunal: raw.siglaTribunal ?? '',
    numeroProcesso: raw.numeroprocessocommascara ?? raw.numero_processo ?? raw.numeroProcesso ?? '',
    partes: (raw.destinatarios ?? []).map((d: { nome?: string; polo?: string }) => ({ nome: d.nome, polo: d.polo })),
    link: raw.link ?? '',
    texto: raw.texto ?? '',
  };
}

function contarCredores(items: DjenItem[]): [string, number][] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const haystack = stripHtml(item.texto ?? '').toLowerCase() + ' ' + (item.orgao ?? '').toLowerCase();
    for (const c of CREDORES) {
      if (haystack.includes(c.toLowerCase())) {
        map[c] = (map[c] ?? 0) + 1;
      }
    }
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function contarPorChave(items: DjenItem[], fn: (i: DjenItem) => string): [string, number][] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = fn(item);
    if (k) map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

// ─── CRM Modal ───────────────────────────────────────────────────────────────

function CrmModal({ item, onClose }: { item: DjenItem; onClose: () => void }) {
  const [estado, setEstado] = useState<'idle' | 'loading' | 'added' | 'exists' | 'error'>('idle');

  async function handleConfirmar() {
    setEstado('loading');
    try {
      const res = await fetch('/api/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroCnj: item.numeroProcesso,
          tribunal: item.tribunal || item.orgao || undefined,
          areaDireito: item.classe || undefined,
        }),
      });
      if (res.status === 200) setEstado('exists');
      else if (res.status === 201) setEstado('added');
      else setEstado('error');
    } catch {
      setEstado('error');
    }
  }

  const done = estado === 'added' || estado === 'exists';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Adicionar ao CRM</h2>
          <p className="text-xs text-gray-500 mt-0.5">Confirme os dados antes de adicionar</p>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-96 overflow-y-auto">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Número do processo</p>
            <p className="text-sm font-mono font-semibold text-gray-900">{item.numeroProcesso || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {item.tribunal && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Tribunal</p>
                <p className="text-sm text-gray-900">{item.tribunal}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Data</p>
              <p className="text-sm text-gray-900">{formatDate(item.data) || '—'}</p>
            </div>
          </div>
          {item.classe && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Tipo de ação</p>
              <p className="text-sm text-gray-900">{item.classe}</p>
            </div>
          )}
          {item.orgao && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Órgão</p>
              <p className="text-sm text-gray-900">{item.orgao}</p>
            </div>
          )}
          {item.partes && item.partes.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Partes</p>
              <div className="space-y-1">
                {item.partes.slice(0, 5).map((p, i) => (
                  <p key={i} className="text-sm text-gray-900">
                    {p.polo && (
                      <span className="text-xs text-gray-400 uppercase mr-1.5 font-medium">{p.polo}</span>
                    )}
                    {p.nome}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          {done ? (
            <div className="text-center space-y-2">
              <p className={`text-sm font-medium ${estado === 'added' ? 'text-green-700' : 'text-blue-700'}`}>
                {estado === 'added' ? '✓ Processo adicionado ao CRM!' : '✓ Processo já está no seu CRM'}
              </p>
              <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:underline">
                Fechar
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={estado === 'loading'}
                className="flex-1 py-2 text-sm font-medium text-white bg-[#0f2d5e] rounded-md hover:bg-[#1a3d7c] disabled:opacity-50 transition-colors"
              >
                {estado === 'loading'
                  ? 'Adicionando…'
                  : estado === 'error'
                  ? 'Tentar novamente'
                  : 'Confirmar e Adicionar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Radar de Oportunidades ───────────────────────────────────────────────────

type RadarState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      total: number;
      amostra: number;
      credores: [string, number][];
      porTipo: [string, number][];
      tribunais: [string, number][];
    };

function RadarCard({ values }: { values: FormValues }) {
  const [state, setState] = useState<RadarState>({ status: 'idle' });

  async function analisar() {
    setState({ status: 'loading' });
    try {
      const termoCombinado = [values.texto, values.nomeParte].filter(Boolean).join(' ');
      const fetches = [0, 100, 200].map((offset) => {
        const p = new URLSearchParams({ limit: '100', offset: String(offset) });
        if (termoCombinado) p.set('texto', termoCombinado);
        if (values.tipoComunicacao) p.set('tipoComunicacao', values.tipoComunicacao);
        return fetch(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?${p}`).then((r) => r.json());
      });
      const batches = await Promise.all(fetches);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = (batches[0] as any)?.count ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: DjenItem[] = batches.flatMap((b: any) => (b.items ?? []).map(mapItem));
      setState({
        status: 'ready',
        total,
        amostra: items.length,
        credores: contarCredores(items),
        porTipo: contarPorChave(items, (i) => i.tipo),
        tribunais: contarPorChave(items, (i) => i.tribunal),
      });
    } catch {
      setState({ status: 'idle' });
    }
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-indigo-900">Radar de Oportunidades</h3>
          <p className="text-xs text-indigo-600 mt-0.5">
            Análise agregada de até 300 publicações no DJEN Nacional para este termo
          </p>
        </div>
        {state.status === 'idle' && (
          <button
            type="button"
            onClick={analisar}
            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Analisar mercado
          </button>
        )}
        {state.status === 'loading' && (
          <span className="shrink-0 text-xs text-indigo-500 animate-pulse">Analisando 300 publicações…</span>
        )}
        {state.status === 'ready' && (
          <button
            type="button"
            onClick={() => setState({ status: 'idle' })}
            className="shrink-0 text-xs text-indigo-400 hover:text-indigo-600 hover:underline"
          >
            Atualizar
          </button>
        )}
      </div>

      {state.status === 'ready' && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-md p-3 border border-indigo-100">
              <p className="text-xl font-bold text-indigo-900">{state.total.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-500 mt-0.5">total no DJEN</p>
            </div>
            <div className="bg-white rounded-md p-3 border border-indigo-100">
              <p className="text-xl font-bold text-indigo-900">{state.amostra}</p>
              <p className="text-xs text-gray-500 mt-0.5">analisadas</p>
            </div>
            <div className="bg-white rounded-md p-3 border border-indigo-100">
              <p className="text-xl font-bold text-indigo-900">{state.credores.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">credores</p>
            </div>
          </div>

          {state.credores.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-indigo-800 mb-2">Principais credores / atores identificados</p>
              <div className="space-y-2">
                {state.credores.map(([nome, qtd]) => (
                  <div key={nome} className="flex items-center gap-2">
                    <span className="text-xs text-gray-700 w-28 shrink-0 truncate">{nome}</span>
                    <div className="flex-1 bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.round((qtd / state.credores[0][1]) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 w-6 text-right">{qtd}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {state.porTipo.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-indigo-800 mb-2">Por tipo de comunicação</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.porTipo.map(([tipo, qtd]) => (
                    <span
                      key={tipo}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 rounded-full text-xs text-indigo-800"
                    >
                      {tipo} <span className="font-semibold">{qtd}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {state.tribunais.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-indigo-800 mb-2">Por tribunal</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.tribunais.map(([tribunal, qtd]) => (
                    <span
                      key={tribunal}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 rounded-full text-xs text-indigo-800"
                    >
                      {tribunal} <span className="font-semibold">{qtd}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card de publicação ───────────────────────────────────────────────────────

function PublicacaoCard({
  item,
  searchTerms = [],
  onAbrirCrm,
}: {
  item: DjenItem;
  searchTerms?: string[];
  onAbrirCrm: (item: DjenItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const plain = stripHtml(item.texto ?? '');
  const textoPlain = plain.slice(0, expanded ? 3000 : 300);

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
              onClick={() => onAbrirCrm(item)}
              className="text-xs px-2.5 py-1 rounded-md font-medium border transition-colors bg-[#0f2d5e]/5 text-[#0f2d5e] border-[#0f2d5e]/20 hover:bg-[#0f2d5e] hover:text-white"
            >
              + CRM
            </button>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
            >
              Ver ↗
            </a>
          )}
        </div>
      </div>

      {item.numeroProcesso && (
        <p className="text-sm font-bold text-gray-900 font-mono tracking-tight">{item.numeroProcesso}</p>
      )}
      {item.tribunal && item.orgao ? (
        <p className="text-xs text-gray-600">
          <span className="font-medium">{item.tribunal}</span> · {highlight(item.orgao, searchTerms)}
        </p>
      ) : item.orgao ? (
        <p className="text-xs text-gray-600">{highlight(item.orgao, searchTerms)}</p>
      ) : null}
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

// ─── Conteúdo principal ───────────────────────────────────────────────────────

function DjenNacionalBuscaContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<BuscaState>({ status: 'idle' });
  const [favoritoSalvo, setFavoritoSalvo] = useState(false);
  const [crmItem, setCrmItem] = useState<DjenItem | null>(null);
  const [lastSearch, setLastSearch] = useState<FormValues | null>(null);

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
      limit: String(loteSize),
      offset: String(offset),
    });
    if (values.numeroProcesso?.trim()) {
      params.set('numeroProcesso', values.numeroProcesso.replace(/[.\-/]/g, ''));
    } else {
      const termoCombinado = [values.texto, values.nomeParte].filter(Boolean).join(' ');
      if (termoCombinado) params.set('texto', termoCombinado);
      if (values.data) params.set('dataDisponibilizacao', values.data);
    }
    if (values.tipoComunicacao) params.set('tipoComunicacao', values.tipoComunicacao);

    const res = await fetch(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?${params}`);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as Record<string, string>;
      throw new Error(err?.error ?? `Erro ${res.status}`);
    }
    return res.json() as Promise<{ items?: unknown[]; count?: number }>;
  }

  async function search(values: FormValues, page = 1) {
    setState({ status: 'loading' });
    setLastSearch(values);
    try {
      const offset = (page - 1) * LIMIT;
      const data = await fetchPage(values, offset);
      const total = data.count ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (data.items ?? ([] as any[])).map(mapItem);
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
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{
      id: string;
      nome: string;
      params: Record<string, string>;
    }>;
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

  const isTextSearch = lastSearch ? !lastSearch.numeroProcesso?.trim() : false;

  return (
    <>
      {crmItem && <CrmModal item={crmItem} onClose={() => setCrmItem(null)} />}

      <div className="space-y-6">
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">DJEN Nacional — Diário da Justiça Eletrônico Nacional</p>
          <p>
            Publicações de todos os tribunais do Brasil.{' '}
            <strong>Delay de 1 dia útil</strong> — publicações aparecem no dia seguinte à disponibilização.
          </p>
          <p>
            Combine termos para refinar: bairro + tipo de ação (ex: &quot;capão redondo busca e
            apreensão&quot;). A busca é feita em todos os tribunais do Brasil.
          </p>
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
            <p className="mt-1 text-xs text-gray-500">
              Ex: &quot;capão redondo&quot;, &quot;banco bradesco&quot;, &quot;avenida paulista&quot;
            </p>
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
              <select
                id="tipoComunicacao"
                {...register('tipoComunicacao')}
                disabled={isLoading || byNumero}
                className={inputCls}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
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

        {state.status === 'success' && isTextSearch && lastSearch && (
          <RadarCard
            key={[lastSearch.texto, lastSearch.nomeParte, lastSearch.tipoComunicacao].join('|')}
            values={lastSearch}
          />
        )}

        {state.status === 'success' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {state.items.length === 0
                ? 'Nenhuma publicação encontrada.'
                : `${state.total.toLocaleString('pt-BR')} publicaç${state.total !== 1 ? 'ões' : 'ão'} encontrada${state.total !== 1 ? 's' : ''}`}
              {state.totalPages > 1 && ` — página ${state.page} de ${state.totalPages}`}
            </p>

            <div className="space-y-3">
              {state.items.map((item, idx) => (
                <PublicacaoCard
                  key={item.id ?? idx}
                  item={item}
                  searchTerms={state.searchTerms}
                  onAbrirCrm={setCrmItem}
                />
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
                <span className="text-sm text-gray-500">
                  {state.page} / {state.totalPages}
                </span>
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
    </>
  );
}

export default function DjenNacionalBuscaPage() {
  return (
    <Suspense>
      <DjenNacionalBuscaContent />
    </Suspense>
  );
}
