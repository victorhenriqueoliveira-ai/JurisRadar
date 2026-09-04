import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente de busca jurídica especializado no DJEN Nacional (Diário da Justiça Eletrônico Nacional). Seu papel é entender o que o advogado precisa em linguagem natural e formular a busca correta na API.

## Como a API do DJEN funciona

A busca usa o parâmetro \`texto\` que faz AND entre as palavras no **corpo das publicações**. O nome do órgão/comarca também aparece no texto das publicações.

Exemplos que funcionam:
- "santo amaro busca e apreensão" → encontra publicações de Santo Amaro que mencionam busca e apreensão
- "embu das artes" → encontra publicações da comarca de Embu das Artes
- "bradesco" → encontra publicações que citam Bradesco

## Parâmetros da ferramenta buscar_djen

- \`texto\`: palavras que devem aparecer no corpo da publicação (AND implícito). Use localidade + tipo de ação quando possível.
- \`siglaTribunal\`: **use sempre que o usuário mencionar uma cidade ou estado**. Ex: São Paulo/SP → "TJSP", Rio de Janeiro/RJ → "TJRJ", Minas Gerais/MG → "TJMG", Paraná/PR → "TJPR", Rio Grande do Sul/RS → "TJRS", Bahia/BA → "TJBA", Ceará/CE → "TJCE". Essencial para a API funcionar.
- \`tipoComunicacao\`: "Intimação", "Citação" ou "Edital" (opcional)
- \`data\`: data de disponibilização no formato YYYY-MM-DD (opcional)
- \`classeProcessual\`: filtro local por nomeClasse após buscar (busca até 200 itens). Use quando o advogado pedir tipo de ação específico.
- \`limit\`: quantos retornar sem filtro de classe (padrão 20)

## Classes processuais reais no DJEN (pós CPC/2015)

"Ação de Cobrança" como classe **não existe mais**. Equivalências:
- "ação de cobrança" → \`classeProcessual: "cobrança"\` (pega classes que contêm essa palavra)
- "execução de dívida" → \`classeProcessual: "Execução de Título"\`
- "busca e apreensão de veículo" → \`classeProcessual: "Busca e Apreensão"\`
- "despejo" → \`classeProcessual: "Despejo"\`
- "inventário" → \`classeProcessual: "Inventário"\`
- processos cíveis gerais → \`classeProcessual: "Procedimento Comum"\`

## Estratégia de busca

1. Sempre execute buscar_djen antes de responder
2. Se retornar 0 resultados:
   - Tente com termos mais simples (ex: "embu" em vez de "embu das artes")
   - Remova o filtro de classe e tente só pelo texto
   - Execute a nova busca IMEDIATAMENTE, sem pedir confirmação ao usuário
3. Se a busca alternativa também falhar, explique e dê sugestões concretas
4. Você pode chamar buscar_djen mais de uma vez para refinar — FAÇA ISSO AUTOMATICAMENTE

## Tom e formato

- Respostas curtas e diretas, em português
- Informe quantas publicações foram encontradas e de quais tribunais/órgãos
- Se encontrar resultados, faça um breve resumo do que são (ex: "5 citações em ações de busca e apreensão da 1ª Vara de Embu das Artes")
- Se não encontrar, seja claro e proativo nas sugestões
- Data de hoje: ${new Date().toLocaleDateString('pt-BR')}`;

// ─── Tool Definition ──────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: 'buscar_djen',
    description:
      'Busca publicações no DJEN Nacional (Diário da Justiça Eletrônico Nacional). Executa a busca na API do PJe e retorna as publicações encontradas. Pode ser chamada múltiplas vezes para refinar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        texto: {
          type: 'string',
          description: 'Termos de busca no corpo das publicações. AND implícito entre palavras.',
        },
        tipoComunicacao: {
          type: 'string',
          enum: ['Intimação', 'Citação', 'Edital'],
          description: 'Filtro por tipo de comunicação judicial',
        },
        data: {
          type: 'string',
          description: 'Data de disponibilização no formato YYYY-MM-DD',
        },
        classeProcessual: {
          type: 'string',
          description:
            'Filtro local por classe processual (nomeClasse). Busca até 200 publicações e filtra. Ex: "cobrança", "Execução de Título", "Busca e Apreensão".',
        },
        siglaTribunal: {
          type: 'string',
          description:
            'Sigla do tribunal (obrigatório quando a comarca pertence a um estado específico). Ex: "TJSP" para São Paulo, "TJRJ" para Rio de Janeiro, "TJMG" para Minas Gerais. Use sempre que o usuário mencionar uma cidade ou estado.',
        },
        limit: {
          type: 'number',
          description: 'Máximo de resultados sem filtro de classe (padrão: 20, máximo: 100)',
        },
      },
      required: [],
    },
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuscaInput {
  texto?: string;
  tipoComunicacao?: string;
  data?: string;
  classeProcessual?: string;
  siglaTribunal?: string;
  limit?: number;
}

interface RawItem {
  id?: unknown;
  nomeClasse?: string;
  nomeOrgao?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  dataDisponibilizacao?: string;
  data_disponibilizacao?: string;
  numeroprocessocommascara?: string;
  numero_processo?: string;
  destinatarios?: unknown[];
  link?: string;
  texto?: string;
}

interface BuscaResult {
  items: RawItem[];
  total: number;
  totalBruto: number;
  classeFilter: string | null;
  params: BuscaInput;
}

interface BrowserSearchResult {
  toolUseId: string;
  toolContent: string;
  items: RawItem[];
  total: number;
  totalBruto: number;
  classeFilter: string | null;
  params: BuscaInput;
  pendingMessages: Anthropic.MessageParam[];
  userMessage: string;
  originalMessages: Anthropic.MessageParam[];
}

// ─── Fetch Logic ──────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPjePage(
  input: BuscaInput,
  offset: number,
  loteSize: number,
  retries = 2
): Promise<{ items: RawItem[]; count: number }> {
  const params = new URLSearchParams({ limit: String(loteSize), offset: String(offset) });
  if (input.texto) params.set('texto', input.texto);
  if (input.data) params.set('dataDisponibilizacao', input.data);
  if (input.tipoComunicacao) params.set('tipoComunicacao', input.tipoComunicacao);
  if (input.siglaTribunal) params.set('siglaTribunal', input.siglaTribunal);

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(800 * attempt);
    const res = await fetch(`${DJEN_BASE}?${params}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JurisRadar/1.0)',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://comunica.pje.jus.br/',
        'Origin': 'https://comunica.pje.jus.br',
      },
    });
    if (res.ok) {
      const data = await res.json() as { items?: RawItem[]; count?: number };
      return { items: data.items ?? [], count: data.count ?? 0 };
    }
    if (res.status !== 403 && res.status !== 429) throw new Error(`API retornou ${res.status}`);
  }
  throw new Error('API retornou 403 após tentativas — tente novamente em alguns segundos');
}

async function executarBusca(input: BuscaInput): Promise<BuscaResult> {
  const useClassFilter = Boolean(input.classeProcessual?.trim());

  if (!useClassFilter) {
    const loteSize = Math.min(input.limit ?? 20, 100);
    const { items, count } = await fetchPjePage(input, 0, loteSize);
    return { items, total: count, totalBruto: count, classeFilter: null, params: input };
  }

  const MAX_ITEMS = 200;
  const { items: firstItems, count: totalBruto } = await fetchPjePage(input, 0, 100);
  const allItems: RawItem[] = [...firstItems];

  if (totalBruto > 100) {
    await sleep(400);
    const { items: secondItems } = await fetchPjePage(input, 100, Math.min(100, MAX_ITEMS - 100));
    allItems.push(...secondItems);
  }

  const classe = input.classeProcessual!.trim().toLowerCase();
  const filtered = allItems.filter((item) =>
    (item.nomeClasse ?? '').toLowerCase().includes(classe)
  );

  return {
    items: filtered,
    total: filtered.length,
    totalBruto,
    classeFilter: input.classeProcessual!,
    params: input,
  };
}

function resumoParaClaude(result: BuscaResult): string {
  if (result.total === 0) {
    const extra = result.classeFilter
      ? ` (analisadas ${result.totalBruto} publicações, nenhuma com classe contendo "${result.classeFilter}")`
      : '';
    return `Nenhuma publicação encontrada${extra}.`;
  }

  const itens = result.items.slice(0, 8).map((item) => ({
    nomeClasse: item.nomeClasse,
    nomeOrgao: item.nomeOrgao,
    siglaTribunal: item.siglaTribunal,
    tipoComunicacao: item.tipoComunicacao,
    data: item.dataDisponibilizacao ?? item.data_disponibilizacao,
    numeroProcesso: item.numeroprocessocommascara ?? item.numero_processo,
    partes: (item.destinatarios ?? []).slice(0, 2),
  }));

  return JSON.stringify({
    total: result.total,
    totalBruto: result.totalBruto,
    classeFilter: result.classeFilter,
    amostra: itens,
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  const body = await request.json() as {
    messages?: Anthropic.MessageParam[];
    userMessage?: string;
    browserSearchResult?: BrowserSearchResult;
  };

  const { messages = [], userMessage, browserSearchResult } = body;

  // ── Fase 2: browser enviou resultados → resposta em streaming SSE ─────────────
  if (browserSearchResult) {
    const {
      toolUseId, toolContent, items, total, totalBruto, classeFilter, params,
      pendingMessages, userMessage: originalUserMsg, originalMessages,
    } = browserSearchResult;

    const messagesWithResult: Anthropic.MessageParam[] = [
      ...pendingMessages,
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolUseId, content: toolContent }],
      },
    ];

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        function emit(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        try {
          const stream = client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools,
            messages: messagesWithResult,
          });

          stream.on('text', (text) => emit({ type: 'delta', text }));

          const finalMsg = await stream.finalMessage();

          if (finalMsg.stop_reason === 'tool_use') {
            // Claude quer fazer outra busca — envia retry para o browser executar
            const toolBlock = finalMsg.content.find(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            );
            if (toolBlock) {
              emit({
                type: 'retry',
                searchParams: toolBlock.input,
                toolUseId: toolBlock.id,
                pendingMessages: [
                  ...messagesWithResult,
                  { role: 'assistant', content: finalMsg.content },
                ],
                originalMessages,
                userMessage: originalUserMsg,
              });
            }
          } else {
            const fullText = finalMsg.content
              .filter((b): b is Anthropic.TextBlock => b.type === 'text')
              .map((b) => b.text)
              .join('');

            const historyForClient: Anthropic.MessageParam[] = [
              ...originalMessages,
              { role: 'user', content: originalUserMsg },
              { role: 'assistant', content: fullText },
            ];

            emit({
              type: 'done',
              message: fullText,
              items,
              total,
              totalBruto,
              params,
              classeFilter,
              messages: historyForClient,
            });
          }
        } catch (err) {
          emit({ type: 'error', message: err instanceof Error ? err.message : 'Erro desconhecido' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // ── Fase 1: primeira chamada — Claude decide o que buscar ─────────────────────
  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
  }

  const conversationMessages: Anthropic.MessageParam[] = [
    ...messages,
    { role: 'user', content: userMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools,
    messages: conversationMessages,
  });

  if (response.stop_reason === 'tool_use') {
    const toolUseBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    if (toolUseBlock) {
      return NextResponse.json({
        status: 'need_browser_search',
        searchParams: toolUseBlock.input as BuscaInput,
        toolUseId: toolUseBlock.id,
        pendingMessages: [...conversationMessages, { role: 'assistant', content: response.content }],
        originalMessages: messages,
        userMessage,
      });
    }
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const assistantMessage = textBlock?.text ?? '';

  const historyForClient: Anthropic.MessageParam[] = [
    ...messages,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantMessage },
  ];

  return NextResponse.json({
    message: assistantMessage,
    items: [],
    total: 0,
    totalBruto: 0,
    params: null,
    classeFilter: null,
    messages: historyForClient,
  });
}
