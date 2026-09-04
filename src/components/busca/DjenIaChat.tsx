'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react';

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

interface ConvSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

type LoadingPhase = 'thinking' | 'searching' | 'analyzing' | null;

interface SseEvent {
  type: string;
  text?: string;
  searchParams?: Record<string, unknown>;
  toolUseId?: string;
  pendingMessages?: unknown[];
  originalMessages?: unknown[];
  userMessage?: string;
  message?: string;
  items?: unknown[];
  total?: number;
  totalBruto?: number;
  params?: Record<string, unknown> | null;
  classeFilter?: string | null;
  messages?: ApiMessage[];
}

// ─── SSE Parser ──────────────────────────────────────────────────────────────

async function* parseSSE(response: Response): AsyncGenerator<SseEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try { yield JSON.parse(json) as SseEvent; } catch { /* skip malformed */ }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(raw: any): DjenItem {
  return {
    id: raw.id,
    data: raw.dataDisponibilizacao ?? raw.data_disponibilizacao ?? raw.data ?? '',
    tipo: raw.tipoComunicacao ?? raw.tipo ?? '',
    orgao: raw.nomeOrgao ?? raw.orgao ?? '',
    classe: raw.nomeClasse ?? raw.classe ?? '',
    tribunal: raw.siglaTribunal ?? raw.tribunal ?? '',
    numeroProcesso: raw.numeroprocessocommascara ?? raw.numero_processo ?? raw.numeroProcesso ?? '',
    partes: (raw.destinatarios ?? raw.partes ?? []).map((d: { nome?: string; polo?: string }) => ({
      nome: d.nome,
      polo: d.polo,
    })),
    link: raw.link ?? '',
    texto: raw.texto ?? '',
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ─── Painel de resultados — item expandível ───────────────────────────────────

function ResultItem({ item, onAbrirCrm }: { item: DjenItem; onAbrirCrm: (item: DjenItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const plain = stripHtml(item.texto ?? '');

  return (
    <div className="border-b border-white/10 last:border-0 py-3 px-4">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.tipo && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-500/30">
              {item.tipo}
            </span>
          )}
          {item.data && <span className="text-[10px] text-white/40">{formatDate(item.data)}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.numeroProcesso && (
            <button
              type="button"
              onClick={() => onAbrirCrm(item)}
              className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#1e2234] text-white/80 border border-white/20 hover:bg-white hover:text-[#0f1117] transition-colors"
            >
              + CRM
            </button>
          )}
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
              Ver ↗
            </a>
          )}
        </div>
      </div>

      {item.numeroProcesso && (
        <p className="font-mono text-xs font-bold text-white mb-1">{item.numeroProcesso}</p>
      )}
      {(item.tribunal || item.orgao) && (
        <p className="text-[11px] text-white/50 mb-0.5">
          {item.tribunal && <span className="font-medium text-white/60">{item.tribunal} · </span>}
          {item.orgao}
        </p>
      )}
      {item.classe && <p className="text-[10px] text-white/35 italic mb-1">{item.classe}</p>}
      {item.partes.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1.5">
          {item.partes.map((p, i) => (
            <span key={i} className="text-[10px] text-white/50">
              {p.polo && <span className="text-white/30 uppercase mr-0.5 text-[9px] font-medium">{p.polo}</span>}
              {p.nome}
            </span>
          ))}
        </div>
      )}
      {plain && (
        <div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            {expanded ? plain.slice(0, 3000) : plain.slice(0, 140)}
            {!expanded && plain.length > 140 && '…'}
          </p>
          {plain.length > 140 && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center gap-0.5 mt-1 text-[10px] text-purple-400 hover:text-purple-300">
              {expanded ? <><ChevronUp className="w-3 h-3" /> Recolher</> : <><ChevronDown className="w-3 h-3" /> Ver mais</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CRM Modal ────────────────────────────────────────────────────────────────

function CrmModal({ item, onClose }: { item: DjenItem; onClose: () => void }) {
  const [estado, setEstado] = useState<'idle' | 'loading' | 'added' | 'exists' | 'error'>('idle');

  async function handleConfirmar() {
    setEstado('loading');
    try {
      const res = await fetch('/api/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroCnj: item.numeroProcesso, tribunal: item.tribunal || item.orgao || undefined, areaDireito: item.classe || undefined }),
      });
      if (res.status === 200) setEstado('exists');
      else if (res.status === 201) setEstado('added');
      else setEstado('error');
    } catch { setEstado('error'); }
  }

  const done = estado === 'added' || estado === 'exists';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold">Adicionar ao CRM</h2></div>
        <div className="px-5 py-4 space-y-3">
          <div><p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Processo</p><p className="text-sm font-mono font-semibold">{item.numeroProcesso || '—'}</p></div>
          {item.tribunal && <div><p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Tribunal</p><p className="text-sm">{item.tribunal}</p></div>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          {done ? (
            <p className={`text-sm font-medium text-center ${estado === 'added' ? 'text-green-700' : 'text-blue-700'}`}>
              {estado === 'added' ? '✓ Processo adicionado ao CRM!' : '✓ Já está no seu CRM'}
            </p>
          ) : (
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleConfirmar} disabled={estado === 'loading'} className="flex-1 py-2 text-sm font-medium text-white bg-[#0f2d5e] rounded-md hover:bg-[#1a3d7c] disabled:opacity-50">
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

// ─── Skeleton de carregamento de conversa ─────────────────────────────────────

function ConversationSkeleton() {
  const lines = [
    { side: 'start', width: '58%' },
    { side: 'end', width: '42%' },
    { side: 'start', width: '72%' },
    { side: 'end', width: '36%' },
    { side: 'start', width: '65%' },
  ];
  return (
    <div className="space-y-5 py-2">
      {lines.map((l, i) => (
        <div key={i} className={`flex gap-3 items-end ${l.side === 'end' ? 'justify-end' : 'justify-start'} animate-pulse`}>
          {l.side === 'start' && <div className="w-7 h-7 rounded-full bg-white/8 shrink-0" />}
          <div className="h-9 rounded-2xl bg-white/8" style={{ width: l.width }} />
          {l.side === 'end' && <div className="w-7 h-7 rounded-full bg-purple-600/20 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DjenIaChat({ onSwitchToManual }: { onSwitchToManual?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null);
  const [streamingText, setStreamingText] = useState('');
  const [crmItem, setCrmItem] = useState<DjenItem | null>(null);

  // Histórico
  const [history, setHistory] = useState<ConvSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);

  // Painel de resultados
  const [panelItems, setPanelItems] = useState<DjenItem[]>([]);
  const [panelTotal, setPanelTotal] = useState(0);
  const [panelTotalBruto, setPanelTotalBruto] = useState(0);
  const [panelLabel, setPanelLabel] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // setAsActive=true: continua a conversa (clique no histórico)
  // setAsActive=false: só exibe as mensagens como contexto visual, sem ativar a conversa
  const loadConversationById = useCallback(async (conv: ConvSummary, setAsActive = true) => {
    setConversationLoading(true);
    setMessages([]);
    setPanelItems([]);
    setCurrentConvId(null);
    try {
      const res = await fetch(`/api/djen-nacional/conversations/${conv.id}`);
      if (!res.ok) return;
      const data = await res.json() as { conversation: { apiMessages: ApiMessage[] }; messages: ChatMessage[] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgs: ChatMessage[] = data.messages.map((m: any) => ({
        role: m.role, text: m.text,
        items: m.items ? (m.items as unknown[]).map(mapItem) : undefined,
        total: m.total ?? undefined, totalBruto: m.totalBruto ?? undefined, params: m.params ?? undefined,
      }));
      setMessages(msgs);
      if (setAsActive) {
        setApiMessages(data.conversation.apiMessages ?? []);
        setCurrentConvId(conv.id);
      }
      const lastWithItems = [...msgs].reverse().find((m) => m.items && m.items.length > 0);
      if (lastWithItems?.items) {
        setPanelItems(lastWithItems.items);
        setPanelTotal(lastWithItems.total ?? lastWithItems.items.length);
        setPanelTotalBruto(lastWithItems.totalBruto ?? lastWithItems.total ?? lastWithItems.items.length);
        setPanelLabel(String(lastWithItems.params?.texto ?? ''));
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    } catch { /* silent */ } finally {
      setConversationLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (autoLoadLast = false) => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/djen-nacional/conversations');
      if (res.ok) {
        const data = await res.json() as { conversations: ConvSummary[] };
        setHistory(data.conversations);
        if (autoLoadLast && data.conversations.length > 0) {
          // setAsActive=true: ativa a última conversa ao carregar
          // → o usuário continua onde parou; para nova conversa, clica em "+ Novo"
          await loadConversationById(data.conversations[0], true);
        }
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [loadConversationById]);

  useEffect(() => { void loadHistory(true); }, [loadHistory]);

  useEffect(() => {
    if (!isLoading) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isLoading, streamingText]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Salva mensagem do usuário imediatamente ao enviar (cria conversa ou adiciona à existente)
  async function saveUserMessage(userText: string): Promise<string> {
    const existingId = currentConvId;
    if (!existingId) {
      const res = await fetch('/api/djen-nacional/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: userText.slice(0, 120),
          messages: [{ role: 'user', text: userText }],
          apiMessages,
        }),
      });
      if (!res.ok) throw new Error(`Falha ao criar conversa: ${res.status}`);
      const data = await res.json() as { conversation: { id: string } };
      const newId = data.conversation.id;
      setCurrentConvId(newId);
      void loadHistory();
      return newId;
    } else {
      const res = await fetch(`/api/djen-nacional/conversations/${existingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newMessages: [{ role: 'user', text: userText }], apiMessages }),
      });
      if (!res.ok) throw new Error(`Falha ao salvar mensagem: ${res.status}`);
      void loadHistory();
      return existingId;
    }
  }

  // Adiciona mensagem da IA à conversa — com 1 retry automático em falha transitória
  // Trunca o campo `texto` dos itens para evitar payload gigante (publicações DJEN têm HTML completo)
  async function appendAiMessage(msg: ChatMessage, newApiMsgs: ApiMessage[], convId: string | null): Promise<void> {
    if (!convId) return;
    const msgForDb: ChatMessage = {
      ...msg,
      items: msg.items?.map((item) => ({
        ...item,
        texto: stripHtml(item.texto ?? '').slice(0, 400),
      })),
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`/api/djen-nacional/conversations/${convId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newMessages: [msgForDb], apiMessages: newApiMsgs }),
        });
        if (res.ok) { void loadHistory(); return; }
        console.error('[appendAiMessage] falhou status', res.status, await res.text().catch(() => ''));
      } catch (e) { console.error('[appendAiMessage] erro de rede:', e); }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
    void loadHistory();
  }

  function startNewConversation() {
    setMessages([]);
    setApiMessages([]);
    setCurrentConvId(null);
    setInput('');
    setPanelItems([]);
    setPanelLabel('');
    setStreamingText('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function loadConversation(conv: ConvSummary) {
    await loadConversationById(conv);
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/djen-nacional/conversations/${id}`, { method: 'DELETE' });
    if (currentConvId === id) startNewConversation();
    void loadHistory();
  }

  async function fetchDjenBrowser(params: Record<string, unknown>): Promise<{ items: unknown[]; total: number; totalBruto: number; classeFilter: string | null }> {
    const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';
    const useClassFilter = Boolean((params.classeProcessual as string)?.trim());
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
    if (totalBruto > 100) { await new Promise((r) => setTimeout(r, 300)); const second = await fetchPage(100, Math.min(100, 100)); all = [...all, ...(second.items ?? [])]; }
    const classe = (params.classeProcessual as string).trim().toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = all.filter((item: any) => ((item.nomeClasse as string) ?? '').toLowerCase().includes(classe));
    return { items: filtered, total: filtered.length, totalBruto, classeFilter: params.classeProcessual as string };
  }

  function buildToolContent(result: { items: unknown[]; total: number; totalBruto: number; classeFilter: string | null }, params: Record<string, unknown>): string {
    if (result.total === 0) {
      return `Nenhuma publicação encontrada${result.classeFilter ? ` (analisadas ${result.totalBruto}, nenhuma com classe "${result.classeFilter}")` : ''}.`;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const amostra = (result.items as any[]).slice(0, 8).map((item: any) => ({
      nomeClasse: item.nomeClasse, nomeOrgao: item.nomeOrgao, siglaTribunal: item.siglaTribunal,
      tipoComunicacao: item.tipoComunicacao, data: item.dataDisponibilizacao ?? item.data_disponibilizacao,
      numeroProcesso: item.numeroprocessocommascara ?? item.numero_processo,
      partes: (item.destinatarios ?? []).slice(0, 2),
    }));
    return JSON.stringify({ total: result.total, totalBruto: result.totalBruto, classeFilter: result.classeFilter, amostra, params });
  }

  async function send(text: string) {
    const userText = text.trim();
    if (!userText || isLoading || conversationLoading) return;
    setInput('');

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text: userText }];
    setMessages(nextMessages);
    setIsLoading(true);
    setLoadingPhase('thinking');
    setStreamingText('');

    // Salva a mensagem do usuário IMEDIATAMENTE — conversa aparece no histórico antes da IA responder
    let convId: string | null = null;
    try {
      convId = await saveUserMessage(userText);
    } catch { convId = currentConvId; }

    try {
      // ── Fase 1: Claude decide o que buscar ─────────────────────────────────
      const res1 = await fetch('/api/djen-nacional/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: userText, messages: apiMessages }),
      });

      if (!res1.ok) {
        const err = await res1.json().catch(() => ({})) as { error?: string };
        const aiMsg: ChatMessage = { role: 'assistant', text: err.error ?? 'Erro ao consultar a IA.' };
        setMessages([...nextMessages, aiMsg]);
        await appendAiMessage(aiMsg, apiMessages, convId);
        return;
      }

      const phase1 = await res1.json() as {
        status?: string;
        searchParams?: Record<string, unknown>;
        toolUseId?: string;
        pendingMessages?: unknown[];
        originalMessages?: unknown[];
        userMessage?: string;
        message?: string;
        items?: unknown[];
        total?: number;
        totalBruto?: number;
        params?: Record<string, unknown> | null;
        classeFilter?: string | null;
        messages?: ApiMessage[];
      };

      // Resposta direta (sem ferramenta — raro)
      if (phase1.status !== 'need_browser_search') {
        const items = (phase1.items ?? []).map(mapItem);
        const newApiMsgs = phase1.messages ?? [];
        const aiMsg: ChatMessage = { role: 'assistant', text: phase1.message ?? '', items, total: phase1.total, totalBruto: phase1.totalBruto, params: phase1.params ?? undefined };
        setMessages([...nextMessages, aiMsg]);
        setApiMessages(newApiMsgs);
        if (items.length > 0) { setPanelItems(items); setPanelTotal(phase1.total ?? items.length); setPanelTotalBruto(phase1.totalBruto ?? phase1.total ?? items.length); setPanelLabel(userText); }
        await appendAiMessage(aiMsg, newApiMsgs, convId);
        return;
      }

      // ── Fase 2: loop de busca + resposta streaming SSE ──────────────────────
      let pending = {
        searchParams: phase1.searchParams ?? {} as Record<string, unknown>,
        toolUseId: phase1.toolUseId!,
        pendingMessages: phase1.pendingMessages!,
        originalMessages: phase1.originalMessages!,
        userMessage: phase1.userMessage!,
      };

      let finalPhase2: SseEvent | null = null;
      let shouldExit = false;
      let retryCount = 0;
      const MAX_RETRIES = 4;
      // items mantidos localmente — não vêm mais pelo SSE (payload gigante corrompía JSON)
      let finalDjenItems: unknown[] = [];

      while (!finalPhase2 && !shouldExit && retryCount < MAX_RETRIES) {
        retryCount++;
        setLoadingPhase('searching');

        let djenResult: { items: unknown[]; total: number; totalBruto: number; classeFilter: string | null };
        try {
          djenResult = await fetchDjenBrowser(pending.searchParams);
          finalDjenItems = djenResult.items;
        } catch {
          djenResult = { items: [], total: 0, totalBruto: 0, classeFilter: null };
          finalDjenItems = [];
        }

        setLoadingPhase('analyzing');
        setStreamingText('');

        const toolContent = buildToolContent(djenResult, pending.searchParams);

        const res2 = await fetch('/api/djen-nacional/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            browserSearchResult: {
              toolUseId: pending.toolUseId,
              toolContent,
              items: djenResult.items,
              total: djenResult.total,
              totalBruto: djenResult.totalBruto,
              classeFilter: djenResult.classeFilter,
              params: pending.searchParams,
              pendingMessages: pending.pendingMessages,
              userMessage: pending.userMessage,
              originalMessages: pending.originalMessages,
            },
          }),
        });

        if (!res2.ok) {
          const aiMsg: ChatMessage = { role: 'assistant', text: 'Erro ao processar resposta da IA.' };
          setMessages([...nextMessages, aiMsg]);
          await appendAiMessage(aiMsg, apiMessages, convId);
          shouldExit = true;
          break;
        }

        for await (const event of parseSSE(res2)) {
          if (event.type === 'delta') {
            setStreamingText((prev) => prev + (event.text ?? ''));
          } else if (event.type === 'retry') {
            // Claude quer fazer outra busca — continua o loop automaticamente
            setStreamingText('');
            pending = {
              searchParams: (event.searchParams ?? {}) as Record<string, unknown>,
              toolUseId: event.toolUseId!,
              pendingMessages: event.pendingMessages!,
              originalMessages: event.originalMessages!,
              userMessage: event.userMessage!,
            };
            break; // sai do for-await, while continua
          } else if (event.type === 'done') {
            finalPhase2 = event;
            break;
          } else if (event.type === 'error') {
            const errMsg: ChatMessage = { role: 'assistant', text: 'Erro ao processar a busca. Tente novamente.' };
            setMessages([...nextMessages, errMsg]);
            try { await appendAiMessage(errMsg, apiMessages, convId); } catch { /* silent */ }
            shouldExit = true;
            break;
          }
        }
      }

      // Esgotou retries sem resposta
      if (!finalPhase2 && !shouldExit) {
        const aiMsg: ChatMessage = { role: 'assistant', text: 'Não foi possível completar a busca. Tente reformular a consulta.' };
        setMessages([...nextMessages, aiMsg]);
        await appendAiMessage(aiMsg, apiMessages, convId);
        return;
      }

      if (finalPhase2) {
        const items = finalDjenItems.map(mapItem);
        const newApiMsgs = finalPhase2.messages ?? [];
        const aiMsg: ChatMessage = {
          role: 'assistant',
          text: finalPhase2.message ?? '',
          items,
          total: finalPhase2.total,
          totalBruto: finalPhase2.totalBruto,
          params: finalPhase2.params ?? undefined,
        };
        setMessages([...nextMessages, aiMsg]);
        setApiMessages(newApiMsgs);
        if (items.length > 0) {
          setPanelItems(items);
          setPanelTotal(finalPhase2.total ?? items.length);
          setPanelTotalBruto(finalPhase2.totalBruto ?? finalPhase2.total ?? items.length);
          setPanelLabel(userText);
        }
        await appendAiMessage(aiMsg, newApiMsgs, convId);
      }
    } catch {
      const aiMsg: ChatMessage = { role: 'assistant', text: 'Erro de conexão. Verifique sua internet e tente novamente.' };
      setMessages([...nextMessages, aiMsg]);
      try { await appendAiMessage(aiMsg, apiMessages, convId); } catch { /* silent */ }
    } finally {
      setIsLoading(false);
      setLoadingPhase(null);
      setStreamingText('');
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); }
  }

  const hasPanelResults = panelItems.length > 0;

  return (
    <>
      {crmItem && <CrmModal item={crmItem} onClose={() => setCrmItem(null)} />}

      <div className="flex flex-1 min-h-0 bg-[#0f1117] overflow-hidden">

        {/* ── Coluna de histórico (esquerda) ─────────────────────────────────── */}
        <div className="w-70 shrink-0 border-r border-white/10 flex flex-col">
          <div className="p-2 border-b border-white/10">
            <button
              type="button"
              onClick={startNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e2234] hover:bg-[#242840] text-white/80 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {history.length > 0 && (
              <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold tracking-widest uppercase text-white/30">
                Histórico
              </p>
            )}
            {historyLoading && (
              <div className="space-y-1 px-1 pt-1">
                {[70, 55, 80, 60].map((w, i) => (
                  <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
            {!historyLoading && history.length === 0 && (
              <p className="text-xs text-white/30 text-center py-8 px-2">Nenhuma conversa ainda</p>
            )}
            {history.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => void loadConversation(conv)}
                onKeyDown={(e) => e.key === 'Enter' && void loadConversation(conv)}
                className={`w-full text-left px-2.5 py-2 rounded-lg group flex items-start justify-between gap-1 mb-0.5 transition-colors cursor-pointer ${
                  conv.id === currentConvId ? 'bg-[#242840] text-white' : 'text-white/50 hover:bg-[#1e2234] hover:text-white/70'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate leading-snug">{conv.title}</p>
                  <p className="text-[9px] text-white/30 mt-0.5">{relativeTime(conv.updatedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => void deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-white/30 hover:text-red-400 transition-opacity mt-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chat principal (centro) ─────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 shrink-0">
            <span className="text-purple-400 text-sm">✦</span>
            <span className="text-sm font-semibold text-white/80 flex-1">Assistente de Busca DJEN</span>
            {onSwitchToManual && (
              <button
                type="button"
                onClick={onSwitchToManual}
                className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded hover:bg-[#1e2234]"
              >
                ← Busca Manual
              </button>
            )}
          </div>

          {/* Mensagens */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {/* Estado inicial */}
            {messages.length === 0 && !conversationLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                <div>
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4 ring-1 ring-purple-500/30">
                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-bold text-white">Assistente de Busca DJEN</p>
                  <p className="text-sm text-white/40 mt-1.5">Descreva o que você precisa em linguagem natural.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="text-left px-3.5 py-3 rounded-xl border border-white/10 bg-[#161926] text-sm text-white/60 hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-white/80 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skeleton ao carregar conversa */}
            {conversationLoading && <ConversationSkeleton />}

            {/* Mensagens */}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-purple-500/25 ring-1 ring-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-purple-400 text-xs">✦</span>
                  </div>
                )}
                <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-sm'
                      : 'bg-[#1c2033] border border-white/10 text-white/80 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.role === 'assistant' && msg.items && msg.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPanelItems(msg.items!);
                        setPanelTotal(msg.total ?? msg.items!.length);
                        setPanelTotalBruto(msg.totalBruto ?? msg.total ?? msg.items!.length);
                        setPanelLabel(String(msg.params?.texto ?? ''));
                      }}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#1c2033] border border-[#2e3347] text-white/60 hover:text-white/90 hover:border-purple-500/40 transition-colors"
                    >
                      <span className="font-semibold text-purple-400">{msg.total?.toLocaleString('pt-BR')}</span>
                      <span>publicaç{msg.total !== 1 ? 'ões' : 'ão'} · ver →</span>
                    </button>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">V</span>
                  </div>
                )}
              </div>
            ))}

            {/* Loading / Streaming */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-purple-500/25 ring-1 ring-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-purple-400 text-xs">✦</span>
                </div>
                {streamingText ? (
                  <div className="max-w-[80%] bg-[#1c2033] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
                    <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                      {streamingText}
                      <span className="inline-block w-[2px] h-[1.1em] bg-purple-400/70 animate-pulse ml-0.5 align-text-bottom rounded-full" />
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#1c2033] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                      </div>
                      {loadingPhase && (
                        <span className="text-xs text-white/35">
                          {loadingPhase === 'thinking' && 'Pensando…'}
                          {loadingPhase === 'searching' && 'Buscando no DJEN Nacional…'}
                          {loadingPhase === 'analyzing' && 'Analisando resultados…'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 pb-5 pt-3 border-t border-white/10 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder="Escreva uma mensagem…"
                className="flex-1 resize-none px-4 py-3 bg-[#1c2033] border border-[#2e3347] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/60 focus:border-purple-500/40 disabled:opacity-50 max-h-32 overflow-y-auto"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <button
                type="button"
                onClick={() => void send(input)}
                disabled={isLoading || conversationLoading || !input.trim()}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors shrink-0"
              >
                Enviar
              </button>
            </div>
            <p className="text-[10px] text-white/25 mt-2">Enter para enviar · Shift+Enter para nova linha</p>
          </div>
        </div>

        {/* ── Painel de resultados (direita) ──────────────────────────────────── */}
        {hasPanelResults && (
          <div className="w-72 shrink-0 border-l border-white/10 flex flex-col max-h-[800px] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <div className="flex items-start justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">
                  {panelTotal.toLocaleString('pt-BR')} publicaç{panelTotal !== 1 ? 'ões' : 'ão'}
                  {panelTotalBruto > panelTotal && (
                    <span className="text-white/40 font-normal"> de {panelTotalBruto.toLocaleString('pt-BR')}</span>
                  )}
                </p>
                {panelLabel && <p className="text-[10px] text-white/40 truncate mt-0.5">{panelLabel}</p>}
              </div>
              <button type="button" onClick={() => { setPanelItems([]); setPanelLabel(''); }} className="shrink-0 text-white/30 hover:text-white/60 ml-2 mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {panelItems.map((item, i) => (
                <ResultItem key={item.id ?? i} item={item} onAbrirCrm={setCrmItem} />
              ))}
              {panelItems.length < panelTotal && (
                <p className="text-[10px] text-white/30 text-center py-3 border-t border-white/10">
                  Mostrando {panelItems.length} de {panelTotal.toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
