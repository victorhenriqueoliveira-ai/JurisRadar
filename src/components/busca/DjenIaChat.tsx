'use client';

import React, { useState, useRef, useEffect } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  items?: DjenItem[];
  total?: number;
  totalBruto?: number;
  params?: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    partes: (raw.destinatarios ?? []).map((d: { nome?: string; polo?: string }) => ({
      nome: d.nome,
      polo: d.polo,
    })),
    link: raw.link ?? '',
    texto: raw.texto ?? '',
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

// ─── Card de publicação inline no chat ───────────────────────────────────────

function MiniCard({
  item,
  onAbrirCrm,
}: {
  item: DjenItem;
  onAbrirCrm: (item: DjenItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const plain = stripHtml(item.texto ?? '');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.tipo && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium border border-blue-200">
              {item.tipo}
            </span>
          )}
          {item.data && <span className="text-gray-400">{formatDate(item.data)}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.numeroProcesso && (
            <button
              type="button"
              onClick={() => onAbrirCrm(item)}
              className="px-2 py-0.5 rounded-md font-medium border transition-colors bg-[#0f2d5e]/5 text-[#0f2d5e] border-[#0f2d5e]/20 hover:bg-[#0f2d5e] hover:text-white"
            >
              + CRM
            </button>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Ver ↗
            </a>
          )}
        </div>
      </div>

      {item.numeroProcesso && (
        <p className="font-mono font-bold text-gray-900">{item.numeroProcesso}</p>
      )}

      {(item.tribunal || item.orgao) && (
        <p className="text-gray-500">
          {item.tribunal && <span className="font-medium">{item.tribunal} · </span>}
          {item.orgao}
        </p>
      )}

      {item.classe && <p className="text-gray-400 italic">{item.classe}</p>}

      {item.partes.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {item.partes.map((p, i) => (
            <span key={i} className="text-gray-600">
              {p.polo && (
                <span className="text-gray-400 uppercase mr-1 font-medium text-[10px]">{p.polo}</span>
              )}
              {p.nome}
            </span>
          ))}
        </div>
      )}

      {plain && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-gray-500 leading-relaxed">
            {expanded ? plain.slice(0, 2000) : plain.slice(0, 200)}
            {!expanded && plain.length > 200 && '…'}
          </p>
          {plain.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 text-blue-500 hover:underline"
            >
              {expanded ? 'Recolher' : 'Ver mais'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CRM Modal (reaproveitado) ────────────────────────────────────────────────

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
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Processo</p>
            <p className="text-sm font-mono font-semibold">{item.numeroProcesso || '—'}</p>
          </div>
          {item.tribunal && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Tribunal</p>
              <p className="text-sm">{item.tribunal}</p>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          {done ? (
            <p className={`text-sm font-medium text-center ${estado === 'added' ? 'text-green-700' : 'text-blue-700'}`}>
              {estado === 'added' ? '✓ Processo adicionado ao CRM!' : '✓ Já está no seu CRM'}
            </p>
          ) : (
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={estado === 'loading'}
                className="flex-1 py-2 text-sm font-medium text-white bg-[#0f2d5e] rounded-md hover:bg-[#1a3d7c] disabled:opacity-50"
              >
                {estado === 'loading' ? 'Adicionando…' : 'Confirmar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sugestões rápidas ────────────────────────────────────────────────────────

const SUGESTOES = [
  'Busca e apreensão de veículo em Santo Amaro de ontem',
  'Citações de execução fiscal em Campinas esta semana',
  'Intimações de despejo no Juizado Especial de SP',
  'Processos de cobrança no Tribunal de Justiça do RJ',
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DjenIaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [crmItem, setCrmItem] = useState<DjenItem | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch DJEN diretamente do browser (evita bloqueio de IP da Vercel)
  async function fetchDjenBrowser(params: Record<string, unknown>): Promise<{
    items: unknown[];
    total: number;
    totalBruto: number;
    classeFilter: string | null;
  }> {
    const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
    const useClassFilter = Boolean((params.classeProcessual as string)?.trim());
    const MAX_ITEMS = 200;

    async function fetchPage(offset: number, lote: number) {
      const p = new URLSearchParams({ limit: String(lote), offset: String(offset) });
      if (params.texto) p.set('texto', params.texto as string);
      if (params.data) p.set('dataDisponibilizacao', params.data as string);
      if (params.tipoComunicacao) p.set('tipoComunicacao', params.tipoComunicacao as string);
      if (params.siglaTribunal) p.set('siglaTribunal', params.siglaTribunal as string);
      const r = await fetch(`${DJEN_BASE}?${p}`);
      if (!r.ok) throw new Error(`DJEN ${r.status}`);
      return r.json() as Promise<{ items?: unknown[]; count?: number }>;
    }

    if (!useClassFilter) {
      const lote = Math.min((params.limit as number) ?? 20, 100);
      const d = await fetchPage(0, lote);
      return { items: d.items ?? [], total: d.count ?? 0, totalBruto: d.count ?? 0, classeFilter: null };
    }

    const first = await fetchPage(0, 100);
    const totalBruto = first.count ?? 0;
    let all: unknown[] = [...(first.items ?? [])];

    if (totalBruto > 100) {
      await new Promise((r) => setTimeout(r, 300));
      const second = await fetchPage(100, Math.min(100, MAX_ITEMS - 100));
      all = [...all, ...(second.items ?? [])];
    }

    const classe = (params.classeProcessual as string).trim().toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = all.filter((item: any) =>
      ((item.nomeClasse as string) ?? '').toLowerCase().includes(classe)
    );
    return { items: filtered, total: filtered.length, totalBruto, classeFilter: params.classeProcessual as string };
  }

  function buildToolContent(result: { items: unknown[]; total: number; totalBruto: number; classeFilter: string | null }, params: Record<string, unknown>): string {
    if (result.total === 0) {
      const extra = result.classeFilter
        ? ` (analisadas ${result.totalBruto} publicações, nenhuma com classe contendo "${result.classeFilter}")`
        : '';
      return `Nenhuma publicação encontrada${extra}.`;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const amostra = (result.items as any[]).slice(0, 8).map((item: any) => ({
      nomeClasse: item.nomeClasse,
      nomeOrgao: item.nomeOrgao,
      siglaTribunal: item.siglaTribunal,
      tipoComunicacao: item.tipoComunicacao,
      data: item.dataDisponibilizacao ?? item.data_disponibilizacao,
      numeroProcesso: item.numeroprocessocommascara ?? item.numero_processo,
      partes: (item.destinatarios ?? []).slice(0, 2),
    }));
    return JSON.stringify({ total: result.total, totalBruto: result.totalBruto, classeFilter: result.classeFilter, amostra, params });
  }

  async function send(text: string) {
    const userText = text.trim();
    if (!userText || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Fase 1: Claude decide o que buscar
      const res1 = await fetch('/api/djen-nacional/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: userText, messages: apiMessages }),
      });

      if (!res1.ok) {
        const err = await res1.json().catch(() => ({})) as { error?: string };
        setMessages((prev) => [...prev, { role: 'assistant', text: err.error ?? 'Erro ao consultar a IA. Tente novamente.' }]);
        return;
      }

      const phase1 = await res1.json() as {
        status?: string;
        searchParams?: Record<string, unknown>;
        toolUseId?: string;
        pendingMessages?: ApiMessage[];
        originalMessages?: ApiMessage[];
        userMessage?: string;
        message?: string;
        items?: unknown[];
        total?: number;
        totalBruto?: number;
        params?: Record<string, unknown> | null;
        classeFilter?: string | null;
        messages?: ApiMessage[];
      };

      // Claude respondeu sem busca
      if (phase1.status !== 'need_browser_search') {
        const items = (phase1.items ?? []).map(mapItem);
        setMessages((prev) => [...prev, { role: 'assistant', text: phase1.message ?? '', items, total: phase1.total, totalBruto: phase1.totalBruto, params: phase1.params ?? undefined }]);
        setApiMessages(phase1.messages ?? []);
        return;
      }

      // Fase 2: busca diretamente do browser (sem passar pela Vercel)
      let djenResult: { items: unknown[]; total: number; totalBruto: number; classeFilter: string | null };
      try {
        djenResult = await fetchDjenBrowser(phase1.searchParams ?? {});
      } catch {
        djenResult = { items: [], total: 0, totalBruto: 0, classeFilter: null };
      }

      const toolContent = buildToolContent(djenResult, phase1.searchParams ?? {});

      const res2 = await fetch('/api/djen-nacional/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browserSearchResult: {
            toolUseId: phase1.toolUseId,
            toolContent,
            items: djenResult.items,
            total: djenResult.total,
            totalBruto: djenResult.totalBruto,
            classeFilter: djenResult.classeFilter,
            params: phase1.searchParams,
            pendingMessages: phase1.pendingMessages,
            userMessage: phase1.userMessage,
            originalMessages: phase1.originalMessages,
          },
        }),
      });

      if (!res2.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'Erro ao processar resposta da IA.' }]);
        return;
      }

      const phase2 = await res2.json() as {
        message: string;
        items: unknown[];
        total: number;
        totalBruto: number;
        params: Record<string, unknown> | null;
        classeFilter: string | null;
        messages: ApiMessage[];
      };

      const items = (phase2.items ?? []).map(mapItem);
      setMessages((prev) => [...prev, { role: 'assistant', text: phase2.message, items, total: phase2.total, totalBruto: phase2.totalBruto, params: phase2.params ?? undefined }]);
      setApiMessages(phase2.messages ?? []);

    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Erro de conexão. Verifique sua internet e tente novamente.' }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <>
      {crmItem && <CrmModal item={crmItem} onClose={() => setCrmItem(null)} />}

      <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">

          {/* Estado inicial */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
              <div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚖️</span>
                </div>
                <p className="text-base font-semibold text-gray-900">Assistente de Busca DJEN</p>
                <p className="text-sm text-gray-500 mt-1">
                  Descreva o que você precisa em linguagem natural.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="text-left px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm">⚖️</span>
                </div>
              )}

              <div className={`max-w-[85%] space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                {/* Balão de texto */}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#0f2d5e] text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Cards de publicação */}
                {msg.role === 'assistant' && msg.items && msg.items.length > 0 && (
                  <div className="w-full space-y-2">
                    <p className="text-xs text-gray-400 px-1">
                      {msg.total?.toLocaleString('pt-BR')} publicaç{msg.total !== 1 ? 'ões' : 'ão'}
                      {msg.totalBruto && msg.totalBruto > (msg.total ?? 0)
                        ? ` filtradas de ${msg.totalBruto.toLocaleString('pt-BR')} analisadas`
                        : ' encontradas'}
                    </p>
                    {msg.items.slice(0, 20).map((item, i) => (
                      <MiniCard key={item.id ?? i} item={item} onAbrirCrm={setCrmItem} />
                    ))}
                    {msg.items.length > 20 && (
                      <p className="text-xs text-gray-400 text-center py-1">
                        + {msg.items.length - 20} publicações não exibidas
                      </p>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-[#0f2d5e] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">V</span>
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-sm">⚖️</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 pt-3">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => { setMessages([]); setApiMessages([]); }}
              className="text-xs text-gray-400 hover:text-gray-600 mb-2"
            >
              ↺ Nova conversa
            </button>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ex: busca e apreensão de veículo em Embu das Artes de ontem…"
              className="flex-1 resize-none px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors shrink-0"
            >
              Enviar
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      </div>
    </>
  );
}
