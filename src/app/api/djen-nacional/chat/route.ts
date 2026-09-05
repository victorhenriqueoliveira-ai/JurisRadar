import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente de busca jurídica especializado no DJEN Nacional (Diário da Justiça Eletrônico Nacional). Seu papel é entender o que o advogado precisa em linguagem natural e formular a busca correta.

## Como a API do DJEN realmente funciona (comportamento confirmado por testes)

A API tem comportamento específico que você DEVE conhecer:

1. **\`texto\`**: busca AND no **corpo HTML** das publicações. NÃO busca no nome do órgão/foro. Funciona bem para: nomes de partes, CPFs/CNPJs, palavras que aparecem no conteúdo da citação.

2. **\`nomeOrgao\`**: filtro pós-fetch aplicado localmente no \`nomeOrgao\` da publicação. **Este é o filtro correto para comarca/foro.** A API não filtra por órgão nativamente — fazemos isso após receber as publicações.

3. **\`classeProcessual\`**: filtro pós-fetch no campo \`nomeClasse\`. A API não filtra por classe nativamente.

4. **Datas**: a API **ignora** o parâmetro de data e sempre retorna as publicações mais recentes do TJSP. Não é possível buscar histórico via API.

5. **\`tipoComunicacao\`**: funciona nativamente (Intimação, Citação, Edital).

6. **\`siglaTribunal\`**: funciona nativamente.

## Mapeamento de comarcas para nomeOrgao

Quando o usuário mencionar uma comarca/foro, use \`nomeOrgao\` com o termo que aparece no nome oficial:
- Pinheiros → \`nomeOrgao: "pinheiros"\` (bate em "Foro Regional VI - Pinheiros", "Vara... Pinheiros")
- Santo Amaro → \`nomeOrgao: "amaro"\` (bate em "Foro Regional II - Santo Amaro", "UPJ... Santo Amaro")
- Campo Limpo → \`nomeOrgao: "campo limpo"\`
- Parelheiros → \`nomeOrgao: "parelheiros"\`
- Embu das Artes → \`nomeOrgao: "embu"\`
- Osasco → \`nomeOrgao: "osasco"\`
- Zona Sul (todos os foros) → use múltiplos: chame buscar_djen separado para cada comarca

## Parâmetros da ferramenta buscar_djen

- \`texto\`: palavras no **corpo** da publicação (nome de parte, CPF, palavra específica). Opcional — não use para comarca.
- \`nomeOrgao\`: substring do nome do órgão/foro para filtrar comarca. Ex: "amaro", "pinheiros", "osasco".
- \`classeProcessual\`: substring do nomeClasse para filtrar tipo de ação. Ex: "Busca e Apreensão", "Inventário", "cobrança".
- \`tipoComunicacao\`: "Intimação", "Citação" ou "Edital".
- \`siglaTribunal\`: sempre "TJSP" para SP. Obrigatório.
- \`limit\`: resultados sem filtros pós-fetch (padrão 20, máximo 100). Ignorado quando há nomeOrgao ou classeProcessual.

## Classes processuais reais

- "busca e apreensão" → \`classeProcessual: "Busca e Apreensão"\`
- "usucapião" → \`classeProcessual: "Usucapião"\` + \`tipoComunicacao: "Edital"\`
- "inventário" → \`classeProcessual: "Inventário"\`
- "interdição" → \`classeProcessual: "Interdição"\`
- "alvará judicial" → \`classeProcessual: "Alvará"\`
- "ação de cobrança" → \`classeProcessual: "cobrança"\`
- "execução de dívida" → \`classeProcessual: "Execução de Título"\`
- "despejo" → \`classeProcessual: "Despejo"\`

## Siglas de tribunais

São Paulo/SP → "TJSP" | Rio de Janeiro/RJ → "TJRJ" | Minas Gerais/MG → "TJMG" | Paraná/PR → "TJPR" | RS → "TJRS" | BA → "TJBA" | CE → "TJCE"

## Estratégia de busca — siga esta ordem

1. **Primeira busca**: siglaTribunal + nomeOrgao (comarca) + classeProcessual (tipo) + tipoComunicacao se relevante
2. **Se 0 resultados** (AUTOMATICAMENTE):
   - Tente sem \`classeProcessual\` mas mantendo \`nomeOrgao\`
   - Ou tente \`nomeOrgao\` mais curto (ex: "amaro" → "santo")
3. **Se ainda 0**: tente só \`classeProcessual\` sem \`nomeOrgao\`
4. Só após 3 tentativas informe o usuário

Você pode chamar buscar_djen até 4 vezes — FAÇA ISSO AUTOMATICAMENTE sem pedir confirmação.

## Tom e formato

- Respostas curtas e diretas, em português
- Informe quantas publicações foram encontradas e de quais órgãos
- Se encontrar, liste os órgãos/comarcas que apareceram (ex: "8 citações: 5 de Santo Amaro, 3 de Osasco")
- Se não encontrar, explique e sugira alternativas concretas
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
          description: 'Palavras que devem aparecer no CORPO da publicação (nome de parte, CPF, palavra específica). NÃO use para filtrar por comarca — use nomeOrgao para isso.',
        },
        nomeOrgao: {
          type: 'string',
          description: 'Substring do nome do órgão/foro para filtrar por comarca (filtro pós-fetch). Ex: "amaro" filtra "Foro Regional II - Santo Amaro". Use: "pinheiros", "amaro", "campo limpo", "parelheiros", "embu", "osasco".',
        },
        tipoComunicacao: {
          type: 'string',
          enum: ['Intimação', 'Citação', 'Edital'],
          description: 'Filtro por tipo de comunicação judicial',
        },
        classeProcessual: {
          type: 'string',
          description: 'Substring do nomeClasse para filtrar tipo de ação (filtro pós-fetch). Ex: "Busca e Apreensão", "Inventário", "cobrança", "Usucapião", "Alvará".',
        },
        siglaTribunal: {
          type: 'string',
          description: 'Sigla do tribunal. Sempre "TJSP" para São Paulo. Obrigatório quando o usuário mencionar uma cidade ou estado.',
        },
        limit: {
          type: 'number',
          description: 'Máximo de resultados quando não há filtros pós-fetch (padrão: 20, máximo: 100). Ignorado quando nomeOrgao ou classeProcessual estão ativos.',
        },
      },
      required: [],
    },
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuscaInput {
  texto?: string;
  nomeOrgao?: string;
  tipoComunicacao?: string;
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

const MAX_ITEMS = 500;

async function executarBusca(input: BuscaInput): Promise<BuscaResult> {
  const useClassFilter = Boolean(input.classeProcessual?.trim());
  const useOrgaoFilter = Boolean(input.nomeOrgao?.trim());
  const usePostFetch = useClassFilter || useOrgaoFilter;

  // Sem filtros pós-fetch: busca simples paginada
  if (!usePostFetch) {
    const loteSize = Math.min(input.limit ?? 20, 100);
    const { items, count } = await fetchPjePage(input, 0, loteSize);
    return { items, total: count, totalBruto: count, classeFilter: null, params: input };
  }

  // Com filtros pós-fetch: busca 500 itens para ter amostra representativa
  const { items: firstItems, count: totalBruto } = await fetchPjePage(input, 0, 100);
  const allItems: RawItem[] = [...firstItems];

  const pages = Math.min(Math.ceil(MAX_ITEMS / 100), Math.ceil(totalBruto / 100));
  for (let page = 1; page < pages && allItems.length < MAX_ITEMS; page++) {
    await sleep(300);
    const { items } = await fetchPjePage(input, page * 100, 100);
    allItems.push(...items);
  }

  // Filtro pós-fetch por nomeOrgao (substring, case-insensitive)
  let filtered = allItems;
  if (useOrgaoFilter) {
    const orgao = input.nomeOrgao!.trim().toLowerCase();
    filtered = filtered.filter((item) =>
      (item.nomeOrgao ?? '').toLowerCase().includes(orgao)
    );
  }

  // Filtro pós-fetch por classeProcessual (substring, case-insensitive)
  if (useClassFilter) {
    const classe = input.classeProcessual!.trim().toLowerCase();
    filtered = filtered.filter((item) =>
      (item.nomeClasse ?? '').toLowerCase().includes(classe)
    );
  }

  return {
    items: filtered,
    total: filtered.length,
    totalBruto,
    classeFilter: useClassFilter ? input.classeProcessual! : null,
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
              // items omitido — cliente já tem os itens do fetchDjenBrowser
              // incluir aqui causava SSE gigante que corrompía o JSON no split TCP
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
