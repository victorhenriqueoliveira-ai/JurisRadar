'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { Plus, Menu, X, Send, Scale, MapPin, FileText } from 'lucide-react';
import { eprocConsultaPublicaLink } from '@/lib/distribuicao-tjsp/eproc-link';

// ─── Markdown leve (negrito, títulos ##, listas -) — sem dependência externa ──

function renderInlineBold(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
    ),
  );
}

function renderMarkdownLite(text: string) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList(key: string) {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 space-y-0.5">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInlineBold(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      flushList(`list-${i}`);
      blocks.push(
        <h3 key={i} className="font-semibold text-[15px] mt-1">
          {renderInlineBold(trimmed.slice(3), `h-${i}`)}
        </h3>,
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList(`list-${i}`);
      blocks.push(<div key={i} className="h-1" />);
    } else {
      flushList(`list-${i}`);
      blocks.push(<p key={i}>{renderInlineBold(line, `p-${i}`)}</p>);
    }
  });
  flushList('list-end');

  return <div className="space-y-1">{blocks}</div>;
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ProcessoCard {
  numeroProcesso: string;
  comarca?: string | null;
  vara?: string | null;
  classe?: string | null;
  dataDistribuicao?: string | null;
  partes?: Array<{ polo: string; nome: string }>;
  assuntos?: string[];
  ultimaMovimentacao?: { data: string; descricao: string } | null;
  detalhado: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  processos?: ProcessoCard[];
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// Formato Anthropic MessageParam — tratado como opaco no cliente, só repassado ao servidor
type ApiMessage = unknown;


function ProcessoCardView({ p }: { p: ProcessoCard }) {
  const reu = p.partes?.find((parte) => /passivo|r[eé]u|executado/i.test(parte.polo));
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white text-sm space-y-1.5 min-w-[240px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-gray-500">{p.numeroProcesso}</span>
        {p.dataDistribuicao && (
          <span className="text-xs text-gray-400">
            {new Date(p.dataDistribuicao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </span>
        )}
      </div>
      {p.classe && (
        <div className="flex items-center gap-1.5 text-gray-800 font-medium">
          <Scale className="w-3.5 h-3.5 shrink-0 text-blue-600" />
          <span>{p.classe}</span>
        </div>
      )}
      {(p.comarca || p.vara) && (
        <div className="flex items-start gap-1.5 text-gray-600">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
          <span>{p.vara ?? p.comarca}</span>
        </div>
      )}
      {reu && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-amber-800">
          <span className="font-semibold">Réu/Executado:</span> {reu.nome}
        </div>
      )}
      {p.assuntos && p.assuntos.length > 0 && (
        <p className="text-xs text-gray-500">{p.assuntos.slice(0, 2).join(', ')}</p>
      )}
      <a
        href={eprocConsultaPublicaLink(p.numeroProcesso)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium pt-0.5"
      >
        <FileText className="w-3 h-3" /> Ver no eproc ↗
      </a>
    </div>
  );
}

export default function DistribuicaoTjspIaChat() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // drawer mobile
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(() => {
    fetch('/api/busca/distribuicao-tjsp/conversations')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { conversations?: ConversationSummary[] } | null) => {
        if (data?.conversations) setConversations(data.conversations);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  function handleNovaConversa() {
    setActiveId(null);
    setMessages([]);
    setApiMessages([]);
    setInput('');
    setSidebarOpen(false);
  }

  async function handleAbrirConversa(id: string) {
    setSidebarOpen(false);
    setActiveId(id);
    try {
      const res = await fetch(`/api/busca/distribuicao-tjsp/conversations/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as {
        conversation: { apiMessages: ApiMessage[] };
        messages: Array<{ role: 'user' | 'assistant'; text: string; processos?: ProcessoCard[] }>;
      };
      setMessages(data.messages.map((m) => ({ role: m.role, text: m.text, processos: m.processos ?? undefined })));
      setApiMessages(data.conversation.apiMessages ?? []);
    } catch {
      // mantém estado atual se falhar
    }
  }

  async function handleEnviar() {
    const texto = input.trim();
    if (!texto || isSending) return;
    setInput('');
    setIsSending(true);

    const novasMensagens: ChatMessage[] = [...messages, { role: 'user', text: texto }];
    setMessages(novasMensagens);

    try {
      const res = await fetch('/api/busca/distribuicao-tjsp/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, userMessage: texto }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as Record<string, string>)?.error ?? `Erro ${res.status}`);
      }
      const data = await res.json() as {
        message: string;
        processos: ProcessoCard[];
        messages: ApiMessage[];
      };

      const mensagensFinais: ChatMessage[] = [
        ...novasMensagens,
        { role: 'assistant', text: data.message, processos: data.processos },
      ];
      setMessages(mensagensFinais);
      setApiMessages(data.messages);

      // Persiste: cria conversa nova na primeira mensagem, ou adiciona nas seguintes
      if (!activeId) {
        const createRes = await fetch('/api/busca/distribuicao-tjsp/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: texto.slice(0, 80),
            messages: mensagensFinais,
            apiMessages: data.messages,
          }),
        });
        if (createRes.ok) {
          const created = await createRes.json() as { conversation: { id: string } };
          setActiveId(created.conversation.id);
          loadConversations();
        }
      } else {
        await fetch(`/api/busca/distribuicao-tjsp/conversations/${activeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newMessages: [
              { role: 'user', text: texto },
              { role: 'assistant', text: data.message, processos: data.processos },
            ],
            apiMessages: data.messages,
          }),
        });
        loadConversations();
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Erro: ${e instanceof Error ? e.message : 'desconhecido'}` },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden relative">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar de histórico — estilo claude.ai */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30 w-72 shrink-0 bg-white border-r border-gray-200
          flex flex-col min-h-0 transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleNovaConversa}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova conversa
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden ml-2 p-2 text-gray-500 hover:text-gray-700"
            aria-label="Fechar histórico"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1">
          <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Histórico</p>
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-xs text-gray-400 text-center">Nenhuma conversa ainda.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleAbrirConversa(c.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                activeId === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={c.title}
            >
              {c.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Painel principal do chat */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="md:hidden flex items-center gap-2 p-3 border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900"
            aria-label="Abrir histórico"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-700">Processos Novos — IA</span>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 px-4">
              <Scale className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm max-w-sm">
                Pergunte, por exemplo: <em>&quot;busca e apreensão em Santo Amaro nas últimas 2 semanas&quot;</em> ou{' '}
                <em>&quot;processos novos de usucapião em Campinas&quot;</em>.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm break-words ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white whitespace-pre-wrap rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {m.role === 'assistant' ? renderMarkdownLite(m.text) : m.text}
                </div>
                {m.processos && m.processos.length > 0 && (
                  <div className="flex flex-wrap gap-2 w-full">
                    {m.processos.slice(0, 12).map((p) => (
                      <ProcessoCardView key={p.numeroProcesso} p={p} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-gray-200 text-sm text-gray-400">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleEnviar();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleEnviar();
                }
              }}
              placeholder="Pergunte sobre processos novos..."
              rows={1}
              disabled={isSending}
              className="flex-1 resize-none px-3 py-2.5 border border-gray-300 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 max-h-32"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Enviar"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
