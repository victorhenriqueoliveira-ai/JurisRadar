'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Fonte = 'DJEN' | 'DataJud' | 'DJe TJSP';

interface UnifiedItem {
  _key: string;
  _fonte: Fonte;
  // campos compartilhados
  numeroProcesso?: string;
  tribunal?: string;
  classe?: string;
  data?: string;
  // DJEN
  tipo?: string;
  orgao?: string;
  link?: string;
  partes?: Array<{ nome?: string; polo?: string }>;
  texto?: string;
  // DataJud
  grau?: string;
  assunto?: string;
  orgaoJulgador?: string;
  ultimaMovimentacao?: string;
  // DJe TJSP
  instance?: string;
  court?: string;
  processNumber?: string;
  snippet?: string;
}

interface ChatSources {
  djen?: unknown[];
  datajud?: unknown[];
  dje?: unknown[];
}

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: ChatSources;
  params?: unknown;
}

interface ConvSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

type LoadingPhase = 'thinking' | 'searching' | null;

interface SseEvent {
  type: string;
  text?: string;
  tool?: string;
  params?: unknown;
  message?: string;
  sources?: ChatSources;
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
          try { yield JSON.parse(json) as SseEvent; } catch { /* skip */ }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Normalização de resultados ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDjen(raw: any, idx: number): UnifiedItem {
  return {
    _key: `djen-${raw.id ?? idx}`,
    _fonte: 'DJEN',
    tipo: raw.tipoComunicacao ?? raw.tipo ?? '',
    data: raw.dataDisponibilizacao ?? raw.data_disponibilizacao ?? '',
    orgao: raw.nomeOrgao ?? raw.orgao ?? '',
    classe: raw.nomeClasse ?? raw.classe ?? '',
    tribunal: raw.siglaTribunal ?? raw.tribunal ?? '',
    numeroProcesso: raw.numeroprocessocommascara ?? raw.numero_processo ?? raw.numeroProcesso ?? '',
    partes: (raw.destinatarios ?? raw.partes ?? []).map((d: { nome?: string; polo?: string }) => ({ nome: d.nome, polo: d.polo })),
    link: raw.link ?? '',
    texto: raw.texto ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDataJud(raw: any, idx: number): UnifiedItem {
  return {
    _key: `datajud-${raw.numero ?? idx}`,
    _fonte: 'DataJud',
    numeroProcesso: raw.numero ?? '',
    tribunal: raw.tribunal ?? '',
    grau: raw.grau ?? '',
    classe: raw.classe ?? '',
    assunto: raw.assunto ?? '',
    data: raw.dataDistribuicao ?? '',
    orgaoJulgador: raw.orgaoJulgador ?? '',
    partes: (raw.partes ?? []).map((p: { nome?: string; polo?: string }) => ({ nome: p.nome, polo: p.polo })),
    ultimaMovimentacao: raw.ultimaMovimentacao?.descricao ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDje(raw: any, idx: number): UnifiedItem {
  return {
    _key: `dje-${raw.id ?? idx}`,
    _fonte: 'DJe TJSP',
    processNumber: raw.process_number ?? raw.processNumber ?? '',
    numeroProcesso: raw.process_number ?? raw.processNumber ?? '',
    tribunal: 'TJSP',
    instance: raw.instance ?? '',
    court: raw.court ?? '',
    data: raw.publication_date ?? raw.publicationDate ?? '',
    snippet: raw.snippet ?? raw.text ?? '',
    classe: raw.instance ?? '',
  };
}

function normalizeSources(sources?: ChatSources): UnifiedItem[] {
  if (!sources) return [];
  const items: UnifiedItem[] = [];
  (sources.djen ?? []).forEach((r, i) => items.push(normalizeDjen(r, i)));
  (sources.datajud ?? []).forEach((r, i) => items.push(normalizeDataJud(r, i)));
  (sources.dje ?? []).forEach((r, i) => items.push(normalizeDje(r, i)));
  return items;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('pt-BR');
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const FONTE_COLORS: Record<Fonte, string> = {
  'DJEN': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'DataJud': 'bg-green-500/20 text-green-300 border-green-500/30',
  'DJe TJSP': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

// ─── Item de resultado ────────────────────────────────────────────────────────

function ResultItem({ item, onAbrirCrm }: { item: UnifiedItem; onAbrirCrm: (item: UnifiedItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const body = stripHtml(item.texto ?? item.snippet ?? '');

  return (
    <div className="border-b border-white/10 last:border-0 py-3 px-4">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${FONTE_COLORS[item._fonte]}`}>
            {item._fonte}
          </span>
          {item.tipo && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[10px] border border-purple-500/20">
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
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-400 hover:text-purple-300">
              Ver ↗
            </a>
          )}
        </div>
      </div>

      {item.numeroProcesso && (
        <p className="font-mono text-xs font-bold text-white mb-1">{item.numeroProcesso}</p>
      )}
      {(item.tribunal || item.orgao || item.court) && (
        <p className="text-[11px] text-white/50 mb-0.5">
          <span className="font-medium text-white/60">{item.tribunal}</span>
          {(item.orgao || item.court) && <span> · {item.orgao ?? item.court}</span>}
          {item.orgaoJulgador && <span> · {item.orgaoJulgador}</span>}
        </p>
      )}
      {item.grau && <span className="text-[10px] text-white/35 mr-2">Grau: {item.grau}</span>}
      {(item.classe || item.assunto) && (
        <p className="text-[10px] text-white/35 italic mb-1">{item.classe}{item.assunto && item.classe !== item.assunto ? ` · ${item.assunto}` : ''}</p>
      )}
      {(item.partes ?? []).length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1.5">
          {(item.partes ?? []).map((p, i) => (
            <span key={i} className="text-[10px] text-white/50">
              {p.polo && <span className="text-white/30 uppercase mr-0.5 text-[9px] font-medium">{p.polo}</span>}
              {p.nome}
            </span>
          ))}
        </div>
      )}
      {item.ultimaMovimentacao && (
        <p className="text-[10px] text-white/35 mb-1 italic">Últ. mov: {item.ultimaMovimentacao}</p>
      )}
      {body && (
        <div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            {expanded ? body.slice(0, 3000) : body.slice(0, 140)}
            {!expanded && body.length > 140 && '…'}
          </p>
          {body.length > 140 && (
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

function CrmModal({ item, onClose }: { item: UnifiedItem; onClose: () => void }) {
  const [estado, setEstado] = useState<'idle' | 'loading' | 'added' | 'exists' | 'error'>('idle');
  async function handleConfirmar() {
    setEstado('loading');
    try {
      const res = await fetch('/api/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroCnj: item.numeroProcesso, tribunal: item.tribunal ?? item.court ?? undefined, areaDireito: item.classe ?? undefined }),
      });
      setEstado(res.status === 200 ? 'exists' : res.status === 201 ? 'added' : 'error');
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConversationSkeleton() {
  return (
    <div className="space-y-5 py-2">
      {[{ side: 'start', w: '60%' }, { side: 'end', w: '40%' }, { side: 'start', w: '70%' }, { side: 'end', w: '35%' }].map((l, i) => (
        <div key={i} className={`flex gap-3 items-end ${l.side === 'end' ? 'justify-end' : 'justify-start'} animate-pulse`}>
          {l.side === 'start' && <div className="w-7 h-7 rounded-full bg-white/8 shrink-0" />}
          <div className="h-9 rounded-2xl bg-white/8" style={{ width: l.w }} />
          {l.side === 'end' && <div className="w-7 h-7 rounded-full bg-purple-600/20 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// ─── Sugestões ────────────────────────────────────────────────────────────────

const SUGESTOES = [
  'Busca e apreensão de veículo em Santo Amaro nos últimos 30 dias',
  'Processos de usucapião na comarca de Campinas',
  'Intimações de execução fiscal no TJSP desta semana',
  'Processos de inventário em São Paulo com publicações recentes',
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BuscaIaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null);
  const [searchingTool, setSearchingTool] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [crmItem, setCrmItem] = useState<UnifiedItem | null>(null);

  const [history, setHistory] = useState<ConvSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);

  const [panelItems, setPanelItems] = useState<UnifiedItem[]>([]);
  const [panelLabel, setPanelLabel] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversationById = useCallback(async (conv: ConvSummary, setAsActive = true) => {
    setConversationLoading(true);
    setMessages([]);
    setPanelItems([]);
    setCurrentConvId(null);
    try {
      const res = await fetch(`/api/busca-ia/conversations/${conv.id}`);
      if (!res.ok) return;
      const data = await res.json() as {
        conversation: { apiMessages: ApiMessage[] };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: any[];
      };
      const msgs: ChatMessage[] = data.messages.map((m) => ({
        role: m.role,
        text: m.text,
        sources: m.sources ?? undefined,
        params: m.params ?? undefined,
      }));
      setMessages(msgs);
      if (setAsActive) {
        setApiMessages(data.conversation.apiMessages ?? []);
        setCurrentConvId(conv.id);
      }
      const lastWithSources = [...msgs].reverse().find((m) => m.sources);
      if (lastWithSources?.sources) {
        setPanelItems(normalizeSources(lastWithSources.sources));
        setPanelLabel(conv.title);
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    } catch { /* silent */ } finally {
      setConversationLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (autoLoadLast = false) => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/busca-ia/conversations');
      if (res.ok) {
        const data = await res.json() as { conversations: ConvSummary[] };
        setHistory(data.conversations);
        if (autoLoadLast && data.conversations.length > 0) {
          await loadConversationById(data.conversations[0], true);
        }
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [loadConversationById]);

  useEffect(() => { void loadHistory(true); }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  async function saveUserMessage(userText: string): Promise<string> {
    if (!currentConvId) {
      const res = await fetch('/api/busca-ia/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: userText.slice(0, 120), messages: [{ role: 'user', text: userText }], apiMessages }),
      });
      if (!res.ok) throw new Error('Falha ao criar conversa');
      const data = await res.json() as { conversation: { id: string } };
      const newId = data.conversation.id;
      setCurrentConvId(newId);
      void loadHistory();
      return newId;
    } else {
      await fetch(`/api/busca-ia/conversations/${currentConvId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newMessages: [{ role: 'user', text: userText }], apiMessages }),
      });
      void loadHistory();
      return currentConvId;
    }
  }

  async function appendAiMessage(msg: ChatMessage, newApiMsgs: ApiMessage[], convId: string | null): Promise<void> {
    if (!convId) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`/api/busca-ia/conversations/${convId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newMessages: [{ role: 'assistant', text: msg.text, sources: msg.sources ?? null, params: msg.params ?? null }], apiMessages: newApiMsgs }),
        });
        if (res.ok) { void loadHistory(); return; }
      } catch { /* retry */ }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
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

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/busca-ia/conversations/${id}`, { method: 'DELETE' });
    if (currentConvId === id) startNewConversation();
    void loadHistory();
  }

  const toolLabel = (tool: string) => {
    if (tool === 'buscar_djen') return 'DJEN Nacional';
    if (tool === 'buscar_datajud') return 'DataJud/CNJ';
    if (tool === 'buscar_dje_tjsp') return 'DJe TJSP';
    return tool;
  };

  async function send(text: string) {
    const userText = text.trim();
    if (!userText || isLoading || conversationLoading) return;
    setInput('');

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text: userText }];
    setMessages(nextMessages);
    setIsLoading(true);
    setLoadingPhase('thinking');
    setStreamingText('');

    let convId: string | null = null;
    try { convId = await saveUserMessage(userText); } catch { convId = currentConvId; }

    try {
      const res = await fetch('/api/busca-ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: userText, messages: apiMessages }),
      });

      if (!res.ok) {
        const aiMsg: ChatMessage = { role: 'assistant', text: 'Erro ao consultar a IA.' };
        setMessages([...nextMessages, aiMsg]);
        await appendAiMessage(aiMsg, apiMessages, convId);
        return;
      }

      let finalSources: ChatSources | undefined;
      let finalText = '';
      let finalApiMsgs: ApiMessage[] = apiMessages;

      for await (const event of parseSSE(res)) {
        if (event.type === 'searching') {
          setLoadingPhase('searching');
          setSearchingTool(toolLabel(event.tool ?? ''));
        } else if (event.type === 'delta') {
          setLoadingPhase(null);
          setStreamingText((prev) => prev + (event.text ?? ''));
          finalText += event.text ?? '';
        } else if (event.type === 'done') {
          finalText = event.message ?? finalText;
          finalSources = event.sources;
          finalApiMsgs = event.messages ?? apiMessages;
          break;
        } else if (event.type === 'error') {
          const aiMsg: ChatMessage = { role: 'assistant', text: 'Erro ao processar a busca. Tente novamente.' };
          setMessages([...nextMessages, aiMsg]);
          try { await appendAiMessage(aiMsg, apiMessages, convId); } catch { /* silent */ }
          return;
        }
      }

      const aiMsg: ChatMessage = { role: 'assistant', text: finalText, sources: finalSources };
      const newApiMsgs = finalApiMsgs;
      setMessages([...nextMessages, aiMsg]);
      setApiMessages(newApiMsgs);

      const items = normalizeSources(finalSources);
      if (items.length > 0) {
        setPanelItems(items);
        setPanelLabel(userText);
      }

      await appendAiMessage(aiMsg, newApiMsgs, convId);
    } catch {
      const aiMsg: ChatMessage = { role: 'assistant', text: 'Erro de conexão. Verifique sua internet e tente novamente.' };
      setMessages([...nextMessages, aiMsg]);
      try { await appendAiMessage(aiMsg, apiMessages, convId); } catch { /* silent */ }
    } finally {
      setIsLoading(false);
      setLoadingPhase(null);
      setSearchingTool('');
      setStreamingText('');
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); }
  }

  const totalResults = panelItems.length;
  const djenCount = panelItems.filter((i) => i._fonte === 'DJEN').length;
  const datajudCount = panelItems.filter((i) => i._fonte === 'DataJud').length;
  const djeCount = panelItems.filter((i) => i._fonte === 'DJe TJSP').length;

  return (
    <>
      {crmItem && <CrmModal item={crmItem} onClose={() => setCrmItem(null)} />}

      <div className="flex flex-1 min-h-0 bg-[#0f1117] overflow-hidden">

        {/* ── Histórico ─────────────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 border-r border-white/10 flex flex-col">
          <div className="p-2 border-b border-white/10">
            <button
              type="button"
              onClick={startNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e2234] hover:bg-[#242840] text-white/80 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova busca
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {history.length > 0 && (
              <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold tracking-widest uppercase text-white/30">Histórico</p>
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
                onClick={() => void loadConversationById(conv)}
                onKeyDown={(e) => e.key === 'Enter' && void loadConversationById(conv)}
                className={`w-full text-left px-2.5 py-2 rounded-lg group flex items-start justify-between gap-1 mb-0.5 cursor-pointer transition-colors ${
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

        {/* ── Chat ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 shrink-0">
            <span className="text-purple-400 text-sm">✦</span>
            <span className="text-sm font-semibold text-white/80 flex-1">Busca IA Unificada</span>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">DJEN</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/15 text-green-300 border border-green-500/25">DataJud</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">DJe TJSP</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && !conversationLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                <div>
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4 ring-1 ring-purple-500/30">
                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-bold text-white">Busca IA Unificada</p>
                  <p className="text-sm text-white/40 mt-1.5 max-w-xs">Pesquisa em DJEN Nacional, DataJud/CNJ e DJe TJSP ao mesmo tempo.</p>
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

            {conversationLoading && <ConversationSkeleton />}

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
                  {msg.role === 'assistant' && msg.sources && (
                    (() => {
                      const items = normalizeSources(msg.sources);
                      if (items.length === 0) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => { setPanelItems(items); setPanelLabel(''); }}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#1c2033] border border-[#2e3347] text-white/60 hover:text-white/90 hover:border-purple-500/40 transition-colors"
                        >
                          <span className="font-semibold text-purple-400">{items.length}</span>
                          <span>resultado{items.length !== 1 ? 's' : ''} · ver →</span>
                        </button>
                      );
                    })()
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">V</span>
                  </div>
                )}
              </div>
            ))}

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
                      <span className="text-xs text-white/35">
                        {loadingPhase === 'thinking' && 'Pensando…'}
                        {loadingPhase === 'searching' && `Buscando no ${searchingTool}…`}
                        {!loadingPhase && 'Analisando…'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-5 pb-5 pt-3 border-t border-white/10 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder="Descreva o que você precisa buscar…"
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

        {/* ── Painel de resultados ───────────────────────────────────────────── */}
        {totalResults > 0 && (
          <div className="w-72 shrink-0 border-l border-white/10 flex flex-col">
            <div className="flex items-start justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">
                  {totalResults} resultado{totalResults !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {djenCount > 0 && <span className="text-[10px] text-blue-300">{djenCount} DJEN</span>}
                  {datajudCount > 0 && <span className="text-[10px] text-green-300">{datajudCount} DataJud</span>}
                  {djeCount > 0 && <span className="text-[10px] text-amber-300">{djeCount} DJe</span>}
                </div>
                {panelLabel && <p className="text-[10px] text-white/40 truncate mt-0.5">{panelLabel}</p>}
              </div>
              <button type="button" onClick={() => { setPanelItems([]); setPanelLabel(''); }} className="shrink-0 text-white/30 hover:text-white/60 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {panelItems.map((item) => (
                <ResultItem key={item._key} item={item} onAbrirCrm={setCrmItem} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
