import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { queryTribunal } from '@/lib/datajud/client';
import { searchPublications } from '@/db/dje';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente de busca jurídica unificada. Tem acesso a três fontes de dados e pode consultá-las em conjunto para dar respostas completas.

## Fontes disponíveis

### 1. buscar_djen — DJEN Nacional (Diário da Justiça Eletrônico)
Busca publicações (intimações, citações, editais) no PJe Nacional.
- Parâmetro \`texto\`: palavras que devem aparecer no corpo da publicação (AND implícito).
- No TJSP, use o nome do fórum, não do bairro: Pinheiros → "Lapa", Campo Limpo → "Campo Limpo", Santo Amaro → "Santo Amaro".
- \`siglaTribunal\`: obrigatório para cidades de SP → "TJSP", RJ → "TJRJ", MG → "TJMG", PR → "TJPR", RS → "TJRS".
- Classes processuais: "Busca e Apreensão", "Usucapião", "Inventário", "Interdição", "Alvará", "Despejo", "Procedimento Comum".
- Use \`tipoComunicacao: "Edital"\` para usucapião.

### 2. buscar_datajud — DataJud / CNJ
Busca processos judiciais na base nacional do CNJ (TJSP).
- \`keyword\`: termo livre (nome de parte, assunto, etc.)
- \`comarca\`: nome da comarca (ex: "São Paulo", "Campinas")
- \`numeroProcesso\`: número CNJ completo
- \`grau\`: "G1" (1º grau), "G2" (2º grau), "JE" (Juizado Especial)
- \`dateFrom\`/\`dateTo\`: datas de distribuição no formato YYYY-MM-DD
- Use quando o usuário quer encontrar processos (não publicações).

### 3. buscar_dje_tjsp — DJe TJSP
Busca publicações no Diário da Justiça Eletrônico do TJSP (banco local).
- \`term\`: termo de busca (full-text search)
- \`dateFrom\`/\`dateTo\`: período de publicação no formato YYYY-MM-DD (obrigatório)
- Use quando o usuário quer publicações específicas do TJSP com controle de data.

## Estratégia de busca

1. Para pedidos amplos (ex: "busca e apreensão em Santo Amaro"), use DJEN + DataJud em paralelo.
2. Para publicações recentes do TJSP com data específica, use DJe TJSP + DJEN.
3. Para busca de processo por número, use DataJud.
4. Se retornar 0 resultados em uma fonte, tente com termos mais simples e informe o usuário.
5. Chame as ferramentas automaticamente — não peça confirmação.

## Tom e formato

- Respostas diretas e objetivas em português
- Informe a fonte de cada resultado (DJEN, DataJud, DJe TJSP)
- Destaque quantos resultados vieram de cada fonte
- Se não encontrar nada, sugira alternativas concretas
- Data de hoje: ${new Date().toLocaleDateString('pt-BR')}`;

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: 'buscar_djen',
    description: 'Busca publicações no DJEN Nacional (intimações, citações, editais no PJe). Executa server-side.',
    input_schema: {
      type: 'object' as const,
      properties: {
        texto: { type: 'string', description: 'Termos no corpo da publicação (AND implícito).' },
        siglaTribunal: { type: 'string', description: 'Sigla do tribunal (ex: TJSP, TJRJ, TJMG). Obrigatório para cidades.' },
        tipoComunicacao: { type: 'string', enum: ['Intimação', 'Citação', 'Edital'] },
        data: { type: 'string', description: 'Data YYYY-MM-DD' },
        classeProcessual: { type: 'string', description: 'Filtro por nomeClasse (ex: "Busca e Apreensão", "Usucapião").' },
        limit: { type: 'number', description: 'Máximo de resultados (padrão 20, máximo 100).' },
      },
      required: [],
    },
  },
  {
    name: 'buscar_datajud',
    description: 'Busca processos judiciais no DataJud/CNJ (TJSP). Use para encontrar processos por número, comarca, assunto ou parte.',
    input_schema: {
      type: 'object' as const,
      properties: {
        keyword: { type: 'string', description: 'Termo livre (nome de parte, assunto, etc.).' },
        numeroProcesso: { type: 'string', description: 'Número CNJ completo do processo.' },
        comarca: { type: 'string', description: 'Nome da comarca (ex: São Paulo, Campinas).' },
        grau: { type: 'string', enum: ['G1', 'G2', 'JE'], description: 'Grau de jurisdição.' },
        dateFrom: { type: 'string', description: 'Data de distribuição inicial YYYY-MM-DD.' },
        dateTo: { type: 'string', description: 'Data de distribuição final YYYY-MM-DD.' },
        limit: { type: 'number', description: 'Máximo de resultados (padrão 20).' },
      },
      required: [],
    },
  },
  {
    name: 'buscar_dje_tjsp',
    description: 'Busca publicações no Diário da Justiça Eletrônico do TJSP (banco local, full-text search). Use com intervalo de datas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        term: { type: 'string', description: 'Termo de busca (full-text search).' },
        dateFrom: { type: 'string', description: 'Data inicial YYYY-MM-DD.' },
        dateTo: { type: 'string', description: 'Data final YYYY-MM-DD.' },
        limit: { type: 'number', description: 'Máximo de resultados (padrão 20).' },
      },
      required: ['term', 'dateFrom', 'dateTo'],
    },
  },
];

// ─── Tool Executors ───────────────────────────────────────────────────────────

interface DjenInput {
  texto?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  data?: string;
  classeProcessual?: string;
  limit?: number;
}

interface DjenRawItem {
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDjenPage(input: DjenInput, offset: number, loteSize: number, retries = 2): Promise<{ items: DjenRawItem[]; count: number }> {
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
      const data = await res.json() as { items?: DjenRawItem[]; count?: number };
      return { items: data.items ?? [], count: data.count ?? 0 };
    }
    if (res.status !== 403 && res.status !== 429) throw new Error(`DJEN API retornou ${res.status}`);
  }
  throw new Error('DJEN API retornou 403 após tentativas — bloqueio temporário');
}

async function executarDjen(input: DjenInput): Promise<{ items: DjenRawItem[]; total: number; classeFilter: string | null }> {
  const useClassFilter = Boolean(input.classeProcessual?.trim());

  if (!useClassFilter) {
    const loteSize = Math.min(input.limit ?? 20, 100);
    const { items, count } = await fetchDjenPage(input, 0, loteSize);
    return { items, total: count, classeFilter: null };
  }

  const { items: firstItems, count: totalBruto } = await fetchDjenPage(input, 0, 100);
  const allItems = [...firstItems];
  if (totalBruto > 100) {
    await sleep(400);
    const { items: secondItems } = await fetchDjenPage(input, 100, Math.min(100, 100));
    allItems.push(...secondItems);
  }
  const classe = input.classeProcessual!.trim().toLowerCase();
  const filtered = allItems.filter((item) => (item.nomeClasse ?? '').toLowerCase().includes(classe));
  return { items: filtered, total: filtered.length, classeFilter: input.classeProcessual! };
}

interface DataJudInput {
  keyword?: string;
  numeroProcesso?: string;
  comarca?: string;
  grau?: 'G1' | 'G2' | 'JE';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

async function executarDataJud(input: DataJudInput): Promise<{ hits: unknown[]; total: number }> {
  const size = Math.min(input.limit ?? 20, 100);
  const { hits, total } = await queryTribunal(
    'api_publica_tjsp',
    {
      ...(input.keyword ? { buscaLivre: input.keyword } : {}),
      ...(input.numeroProcesso ? { numeroProcesso: input.numeroProcesso } : {}),
      ...(input.comarca ? { comarca: input.comarca } : {}),
      ...(input.grau ? { grau: [input.grau] } : {}),
      ...(input.dateFrom ? { dataDistribuicaoInicio: input.dateFrom } : {}),
      ...(input.dateTo ? { dataDistribuicaoFim: input.dateTo } : {}),
    },
    0,
    size,
  );
  return { hits, total };
}

interface DjeInput {
  term: string;
  dateFrom: string;
  dateTo: string;
  limit?: number;
}

async function executarDje(input: DjeInput): Promise<{ results: unknown[]; total: number }> {
  const limit = Math.min(input.limit ?? 20, 100);
  const { results, total } = await searchPublications(
    { term: input.term, dateFrom: input.dateFrom, dateTo: input.dateTo },
    1,
    limit,
    'system',
  );
  return { results, total };
}

function resumoTool(toolName: string, result: unknown): string {
  try {
    if (toolName === 'buscar_djen') {
      const r = result as { items: DjenRawItem[]; total: number; classeFilter: string | null };
      if (r.total === 0) return `DJEN: nenhuma publicação encontrada${r.classeFilter ? ` com classe "${r.classeFilter}"` : ''}.`;
      const amostra = r.items.slice(0, 6).map((item) => ({
        nomeClasse: item.nomeClasse,
        nomeOrgao: item.nomeOrgao,
        tribunal: item.siglaTribunal,
        tipo: item.tipoComunicacao,
        data: item.dataDisponibilizacao ?? item.data_disponibilizacao,
        processo: item.numeroprocessocommascara ?? item.numero_processo,
        partes: (item.destinatarios ?? []).slice(0, 2),
      }));
      return JSON.stringify({ fonte: 'DJEN', total: r.total, classeFilter: r.classeFilter, amostra });
    }

    if (toolName === 'buscar_datajud') {
      const r = result as { hits: unknown[]; total: number };
      if (r.total === 0) return 'DataJud: nenhum processo encontrado.';
      return JSON.stringify({ fonte: 'DataJud', total: r.total, amostra: r.hits.slice(0, 6) });
    }

    if (toolName === 'buscar_dje_tjsp') {
      const r = result as { results: unknown[]; total: number };
      if (r.total === 0) return 'DJe TJSP: nenhuma publicação encontrada no período.';
      return JSON.stringify({ fonte: 'DJe TJSP', total: r.total, amostra: r.results.slice(0, 6) });
    }
  } catch {
    // fallback
  }
  return JSON.stringify(result);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  const body = await request.json() as {
    messages?: Anthropic.MessageParam[];
    userMessage?: string;
  };

  const { messages = [], userMessage } = body;

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      function emit(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Estado acumulado de todas as fontes
        const allSources: Record<string, unknown[]> = { djen: [], datajud: [], dje: [] };
        let allParams: unknown[] = [];

        // Histórico de mensagens que vai crescendo a cada tool call
        let currentMessages: Anthropic.MessageParam[] = [
          ...messages,
          { role: 'user', content: userMessage },
        ];

        // Loop de tool use — Claude pode chamar múltiplas ferramentas
        let loopCount = 0;
        const MAX_LOOPS = 5;

        while (loopCount < MAX_LOOPS) {
          loopCount++;

          const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools,
            messages: currentMessages,
          });

          if (response.stop_reason !== 'tool_use') {
            // Claude terminou — stream a resposta final
            const textContent = response.content
              .filter((b): b is Anthropic.TextBlock => b.type === 'text')
              .map((b) => b.text)
              .join('');

            // Emite texto em chunks para simular streaming
            const words = textContent.split(' ');
            for (let i = 0; i < words.length; i += 8) {
              const chunk = words.slice(i, i + 8).join(' ') + (i + 8 < words.length ? ' ' : '');
              emit({ type: 'delta', text: chunk });
            }

            const historyForClient: Anthropic.MessageParam[] = [
              ...messages,
              { role: 'user', content: userMessage },
              { role: 'assistant', content: textContent },
            ];

            emit({
              type: 'done',
              message: textContent,
              sources: allSources,
              params: allParams,
              messages: historyForClient,
            });
            break;
          }

          // Tem tool_use — executar todas as ferramentas solicitadas
          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          );

          // Adiciona a resposta do assistente com os tool_use
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
          ];

          // Executa todas as tools (pode ser paralelo pois cada uma é independente)
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolBlock of toolUseBlocks) {
            emit({ type: 'searching', tool: toolBlock.name, params: toolBlock.input });

            let resultContent: string;
            try {
              let rawResult: unknown;

              if (toolBlock.name === 'buscar_djen') {
                const input = toolBlock.input as DjenInput;
                rawResult = await executarDjen(input);
                const r = rawResult as { items: DjenRawItem[]; total: number };
                // Armazena itens para o cliente renderizar
                const mappedItems = r.items.slice(0, 50).map((item) => ({
                  id: String(item.id ?? ''),
                  nomeClasse: item.nomeClasse ?? '',
                  nomeOrgao: item.nomeOrgao ?? '',
                  siglaTribunal: item.siglaTribunal ?? '',
                  tipoComunicacao: item.tipoComunicacao ?? '',
                  dataDisponibilizacao: item.dataDisponibilizacao ?? item.data_disponibilizacao ?? '',
                  numeroProcesso: item.numeroprocessocommascara ?? item.numero_processo ?? '',
                  link: item.link ?? '',
                  destinatarios: item.destinatarios ?? [],
                  _fonte: 'DJEN',
                }));
                allSources.djen.push(...mappedItems);
                allParams.push({ tool: 'buscar_djen', ...input });
                resultContent = resumoTool('buscar_djen', rawResult);
              } else if (toolBlock.name === 'buscar_datajud') {
                const input = toolBlock.input as DataJudInput;
                rawResult = await executarDataJud(input);
                const r = rawResult as { hits: unknown[]; total: number };
                allSources.datajud.push(...r.hits.slice(0, 50).map((h) => ({ ...(h as object), _fonte: 'DataJud' })));
                allParams.push({ tool: 'buscar_datajud', ...input });
                resultContent = resumoTool('buscar_datajud', rawResult);
              } else if (toolBlock.name === 'buscar_dje_tjsp') {
                const input = toolBlock.input as DjeInput;
                rawResult = await executarDje(input);
                const r = rawResult as { results: unknown[]; total: number };
                allSources.dje.push(...r.results.slice(0, 50).map((res) => ({ ...(res as object), _fonte: 'DJe TJSP' })));
                allParams.push({ tool: 'buscar_dje_tjsp', ...input });
                resultContent = resumoTool('buscar_dje_tjsp', rawResult);
              } else {
                resultContent = 'Ferramenta desconhecida.';
              }
            } catch (err) {
              resultContent = `Erro ao executar ${toolBlock.name}: ${err instanceof Error ? err.message : 'erro desconhecido'}`;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: resultContent,
            });
          }

          // Adiciona os resultados das tools ao histórico
          currentMessages = [
            ...currentMessages,
            { role: 'user', content: toolResults },
          ];
        }

        if (loopCount >= MAX_LOOPS) {
          emit({ type: 'error', message: 'Limite de buscas atingido.' });
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
