import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { buscarProcessosNovos, defaultDateRange } from '@/lib/distribuicao-tjsp/search';
import { eprocConsultaPublicaLink } from '@/lib/distribuicao-tjsp/eproc-link';
import { queryTribunal } from '@/lib/datajud/client';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TJSP_TRIBUNAL = 'api_publica_tjsp';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOOL_TURNS = 6;

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente de prospecção jurídica. Seu trabalho é ajudar o advogado a encontrar processos NOVOS (recém-distribuídos, onde ele ainda NÃO é parte) para prospectar como clientes em potencial — e trazer um resumo útil de cada caso relevante.

## Suas duas ferramentas e como combiná-las

1. **buscar_processos_novos** — consulta a Lista de Distribuição TJSP (eproc, 1ª Instância). Retorna TODOS os processos novos distribuídos num período, filtráveis por comarca e classe processual. **NÃO traz nome das partes** (sigilo da distribuição inicial) — só comarca, vara, classe, número do processo e data.

2. **detalhar_processo** — consulta a API oficial do CNJ (DataJud) para UM número de processo específico. Traz assuntos, órgão julgador e o **histórico de movimentações** (andamento do processo até agora). **Nome das partes só aparece ocasionalmente** — o DataJud público do CNJ, por restrição de privacidade, geralmente NÃO expõe nome de partes em processos cíveis recém-distribuídos. NÃO prometa ao usuário que vai trazer nome das partes — trate como um bônus raro, não a regra. O valor real dessa ferramenta é confirmar se o processo já tem movimentação (decisão, mandado expedido, etc.) ou ainda está só na distribuição.

## Quando detalhar_processo não encontra nada

Isso é comum e esperado — o DataJud tem cobertura e velocidade de sincronização irregulares, variam de dias a **muitas semanas** dependendo do tribunal/comarca, e não há como saber ou prever o prazo exato. **NUNCA invente um prazo específico** (não diga "24-48h", "alguns dias", etc. — você não tem essa informação). Em vez disso, diga que o DataJud ainda não indexou esse processo e **cite literalmente a URL do campo linkEproc** que vem no resultado da ferramenta — é a consulta pública oficial do TJSP para esse processo exato (sistema eproc), já pronta e correta, mostra nome das partes e andamento completo na hora, sem precisar esperar nada. NUNCA sugira e-SAJ, cpopg ou cjsg — são do sistema SAJ antigo, que não processa esses casos (eles tramitam no eproc) e não vai encontrá-los.

## Fluxo de trabalho

**Se o usuário já der um número de processo específico (ex.: "traga detalhes do processo 4022559-39.2026.8.26.0011" ou responder apontando pra um processo de uma mensagem anterior), chame detalhar_processo DIRETO com esse número — NUNCA chame buscar_processos_novos nesse caso.** buscar_processos_novos é só para quando o usuário pede uma prospecção por comarca/classe/período (ainda não tem um número em mãos) — chamá-la sem necessidade pode disparar indexação de vários dias de PDF e demorar muito à toa.

Para prospecção (usuário sem número de processo ainda):
1. Primeiro chame **buscar_processos_novos** com os filtros que o usuário pediu (comarca, classe, período — se o usuário não disser datas, não precisa informar, o sistema usa os últimos 30 dias por padrão).
2. Se encontrar resultados, escolha os até 5 mais relevantes (ou todos, se forem poucos) e chame **detalhar_processo** para cada um, buscando um resumo do andamento (e nome das partes, se por acaso vier).
3. Responda resumindo os achados: quantos processos novos encontrados, comarca/vara/classe de cada, e se houver nome de parte disponível no detalhamento, destaque-o — mas não finja que sempre vai ter. Para os sem detalhe, mencione o link "Ver no eproc" do card como o caminho pra ver os detalhes agora.
4. Se não encontrar nada, sugira ampliar a comarca ou a classe processual.

Você pode chamar as ferramentas várias vezes seguidas, automaticamente, sem pedir confirmação ao usuário.

## Classes processuais comuns (sugestões de nicho de prospecção)

- "Busca e Apreensão em Alienação Fiduciária" — réu provavelmente não pagou financiamento de veículo
- "Execução de Título Extrajudicial" — réu provavelmente é devedor de dívida com título executivo
- "Usucapião" — autor busca regularizar posse de imóvel
- "Inventário" — herdeiros precisam de advogado
- "Divórcio" — partes precisam de advogado

## Datas — regra crítica

A data de hoje está informada no final deste prompt. **NUNCA chame um processo de "distribuído hoje" a menos que a data dele seja literalmente igual à data de hoje informada aqui.** Um processo retornado pela busca pode ser de qualquer dia dentro do período que o usuário pediu — o mais recente da lista NÃO significa "hoje", significa só "o mais recente dentro do período buscado". Sempre que mencionar uma data, use a data real do processo (campo dataDistribuicao) e nunca deduza ou arredonde.

## URLs — regra crítica

A ÚNICA URL que você pode citar é o valor literal do campo **linkEproc** que vem no resultado das ferramentas (buscar_processos_novos ou detalhar_processo) — ela já é real e específica para aquele processo, pode (e deve) ser escrita por extenso quando o usuário pedir detalhes ou quando o processo não for encontrado no DataJud. **NUNCA invente, sugira ou escreva qualquer OUTRA URL** — nunca e-SAJ, cpopg, cjsg, ou qualquer endereço que não veio literalmente de um campo linkEproc de uma chamada de ferramenta real. Se não tiver um linkEproc à mão pro processo que o usuário está perguntando, chame detalhar_processo primeiro pra consegui-lo — não responda sem ele.

## Tom e formato

- Respostas curtas, diretas, em português
- Sempre cite comarca e classe dos resultados
- Data de hoje: ${new Date().toLocaleDateString('pt-BR')}`;

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: 'buscar_processos_novos',
    description:
      'Busca processos recém-distribuídos na Lista de Distribuição TJSP (eproc, 1ª Instância). Retorna comarca, vara, classe, número do processo e data — sem nome das partes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        comarca: {
          type: 'string',
          description: 'Substring do nome da comarca/foro. Ex: "Santo Amaro", "Campinas", "Osasco".',
        },
        classe: {
          type: 'string',
          description: 'Substring da classe processual. Ex: "Busca e Apreensão", "Usucapião", "Inventário".',
        },
        dataInicio: {
          type: 'string',
          description: 'Data inicial (YYYY-MM-DD). Se omitido, usa os últimos 30 dias.',
        },
        dataFim: {
          type: 'string',
          description: 'Data final (YYYY-MM-DD). Se omitido, usa hoje.',
        },
      },
      required: [],
    },
  },
  {
    name: 'detalhar_processo',
    description:
      'Consulta a API oficial do CNJ (DataJud) para um número de processo específico, trazendo assuntos, órgão julgador e histórico de movimentações (andamento). Nome das partes aparece raramente — não é garantido.',
    input_schema: {
      type: 'object' as const,
      properties: {
        numeroProcesso: {
          type: 'string',
          description: 'Número do processo no formato CNJ (com ou sem máscara). Ex: "4080373-36.2026.8.26.0002".',
        },
      },
      required: ['numeroProcesso'],
    },
  },
];

// ─── Tool Execution ───────────────────────────────────────────────────────────

interface ProcessoCard {
  numeroProcesso: string;
  comarca?: string | null;
  vara?: string | null;
  classe?: string | null;
  dataDistribuicao?: string | null;
  // Preenchido só quando detalhado via DataJud
  partes?: Array<{ polo: string; nome: string }>;
  assuntos?: string[];
  ultimaMovimentacao?: { data: string; descricao: string } | null;
  detalhado: boolean;
  // Link real da consulta pública do eproc — SEMPRE presente, usado pela IA como única URL permitida
  linkEproc: string;
}

async function execBuscarProcessosNovos(input: {
  comarca?: string;
  classe?: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<{ summary: string; processos: ProcessoCard[] }> {
  const defaults = defaultDateRange();
  const { results, total, diasNaoIndexados } = await buscarProcessosNovos(
    {
      comarca: input.comarca,
      classe: input.classe,
      dataInicio: input.dataInicio ?? defaults.dataInicio,
      dataFim: input.dataFim ?? defaults.dataFim,
    },
    1,
    20,
  );

  const processos: ProcessoCard[] = results.map((r) => ({
    numeroProcesso: r.numeroProcesso,
    comarca: r.comarca,
    vara: r.vara,
    classe: r.classe,
    dataDistribuicao: r.dataDistribuicao,
    detalhado: false,
    linkEproc: eprocConsultaPublicaLink(r.numeroProcesso),
  }));

  const avisoIndexacao = diasNaoIndexados.length > 0
    ? ` (${diasNaoIndexados.length} dia(s) do período ainda não foram processados e serão pegos depois)`
    : '';

  const summary = JSON.stringify({
    total,
    amostra: processos.slice(0, 20).map((p) => ({
      numeroProcesso: p.numeroProcesso,
      comarca: p.comarca,
      vara: p.vara,
      classe: p.classe,
      dataDistribuicao: p.dataDistribuicao,
      linkEproc: p.linkEproc,
    })),
    aviso: avisoIndexacao || undefined,
  });

  return { summary, processos };
}

async function execDetalharProcesso(input: { numeroProcesso: string }): Promise<{ summary: string; processo: ProcessoCard | null }> {
  const linkEproc = eprocConsultaPublicaLink(input.numeroProcesso);

  try {
    const { hits } = await queryTribunal(TJSP_TRIBUNAL, { numeroProcesso: input.numeroProcesso }, 0, 1);
    const hit = hits[0];
    if (!hit) {
      return {
        summary: JSON.stringify({
          encontradoNoDataJud: false,
          numeroProcesso: input.numeroProcesso,
          linkEproc,
          instrucao:
            'Não encontrado no DataJud (cobertura/sincronização irregular, sem prazo previsível — não invente prazo). ' +
            'Responda ao usuário citando literalmente a URL em "linkEproc" acima como o link pra ver os detalhes agora na consulta pública oficial do TJSP (sistema eproc). Não sugira nenhuma outra URL.',
        }),
        processo: { numeroProcesso: input.numeroProcesso, detalhado: false, linkEproc },
      };
    }

    const processo: ProcessoCard = {
      numeroProcesso: hit.numero,
      comarca: hit.orgaoJulgador,
      vara: hit.orgaoJulgador,
      classe: hit.classe,
      dataDistribuicao: hit.dataDistribuicao,
      partes: hit.partes?.map((p) => ({ polo: p.polo, nome: p.nome })),
      assuntos: hit.assuntos,
      ultimaMovimentacao: hit.ultimaMovimentacao ?? null,
      detalhado: true,
      linkEproc,
    };

    return {
      summary: JSON.stringify({
        encontradoNoDataJud: true,
        numeroProcesso: processo.numeroProcesso,
        classe: processo.classe,
        assuntos: processo.assuntos,
        orgaoJulgador: hit.orgaoJulgador,
        partes: processo.partes,
        ultimaMovimentacao: processo.ultimaMovimentacao,
        linkEproc,
      }),
      processo,
    };
  } catch (err) {
    return {
      summary: JSON.stringify({
        erro: `Erro ao consultar DataJud: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
        linkEproc,
        instrucao: 'Cite a URL em "linkEproc" como alternativa pra ver os detalhes agora.',
      }),
      processo: { numeroProcesso: input.numeroProcesso, detalhado: false, linkEproc },
    };
  }
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<{ summary: string; processos: ProcessoCard[] }> {
  if (name === 'buscar_processos_novos') {
    return execBuscarProcessosNovos(input);
  }
  if (name === 'detalhar_processo') {
    const { summary, processo } = await execDetalharProcesso(input as { numeroProcesso: string });
    return { summary, processos: processo ? [processo] : [] };
  }
  return { summary: 'Ferramenta desconhecida.', processos: [] };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    throw err;
  }

  const body = await request.json() as {
    messages?: Anthropic.MessageParam[];
    userMessage?: string;
  };
  const { messages = [], userMessage } = body;

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
  }

  const conversationMessages: Anthropic.MessageParam[] = [
    ...messages,
    { role: 'user', content: userMessage },
  ];

  const processosAcumulados: ProcessoCard[] = [];
  const vistos = new Set<string>();
  function acumular(lista: ProcessoCard[]) {
    for (const p of lista) {
      const existente = vistos.has(p.numeroProcesso);
      if (!existente) {
        vistos.add(p.numeroProcesso);
        processosAcumulados.push(p);
      } else if (p.detalhado) {
        // Substitui a versão sem detalhe pela detalhada
        const idx = processosAcumulados.findIndex((x) => x.numeroProcesso === p.numeroProcesso);
        if (idx >= 0) processosAcumulados[idx] = p;
      }
    }
  }

  let response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      tools,
      messages: conversationMessages,
    },
    { signal: request.signal },
  );

  let turns = 0;
  while (response.stop_reason === 'tool_use' && turns < MAX_TOOL_TURNS) {
    turns++;
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    conversationMessages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const { summary, processos } = await executeTool(block.name, block.input as Record<string, unknown>);
      acumular(processos);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: summary });
    }

    conversationMessages.push({ role: 'user', content: toolResults });

    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 1536,
        system: SYSTEM_PROMPT,
        tools,
        messages: conversationMessages,
      },
      { signal: request.signal },
    );
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const assistantMessage = textBlock?.text ?? 'Não consegui gerar uma resposta.';

  const historyForClient: Anthropic.MessageParam[] = [
    ...messages,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantMessage },
  ];

  return NextResponse.json({
    message: assistantMessage,
    processos: processosAcumulados,
    messages: historyForClient,
  });
}
