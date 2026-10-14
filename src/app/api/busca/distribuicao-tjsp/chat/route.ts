import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { buscarProcessosNovos, defaultDateRange } from '@/lib/distribuicao-tjsp/search';
import { eprocConsultaPublicaLink } from '@/lib/distribuicao-tjsp/eproc-link';
import { queryTribunal } from '@/lib/datajud/client';
import { buscarComunicacoesPorNumeroProcesso } from '@/lib/djen/client';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TJSP_TRIBUNAL = 'api_publica_tjsp';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOOL_TURNS = 6;

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente de prospecção jurídica. Seu trabalho é ajudar o advogado a encontrar processos NOVOS (recém-distribuídos, onde ele ainda NÃO é parte) para prospectar como clientes em potencial — e trazer um resumo útil de cada caso relevante.

## Suas duas ferramentas e como combiná-las

1. **buscar_processos_novos** — consulta a Lista de Distribuição TJSP (eproc, 1ª Instância). Retorna TODOS os processos novos distribuídos num período, filtráveis por comarca e classe processual. **NÃO traz nome das partes** (sigilo da distribuição inicial) — só comarca, vara, classe, número do processo e data.

2. **detalhar_processo** — consulta o DJEN Nacional (CNJ/PJe) e, se não achar nada, cai para o DataJud como alternativa. O DJEN normalmente TRAZ nome das partes (autor, réu, advogados) mesmo para processos recém-distribuídos — é a fonte mais confiável das duas. Quando o processo é sigiloso, o nome vem como "SIGILO" (não existe forma de contornar isso — é segredo de justiça real). Se nem DJEN nem DataJud tiverem nada ainda (processo distribuído há poucas horas), use o linkEproc.

## Quando detalhar_processo não encontra nada em nenhuma das duas fontes

Isso pode acontecer pra processos distribuídos há poucas horas (nem o DJEN nem o DataJud indexaram ainda) — não há prazo previsível. **NUNCA invente um prazo específico** (não diga "24-48h", "alguns dias", etc.). Em vez disso, diga que ainda não foi indexado e **cite literalmente a URL do campo linkEproc** que vem no resultado da ferramenta — é a consulta pública oficial do TJSP para esse processo exato (sistema eproc), já pronta e correta. NUNCA sugira e-SAJ, cpopg ou cjsg — são do sistema SAJ antigo, que não processa esses casos (eles tramitam no eproc) e não vai encontrá-los.

## Processo sigiloso (segredo de justiça)

Se o resultado da ferramenta trouxer processoSigiloso: true, diga claramente ao usuário que o nome das partes está protegido por segredo de justiça — isso é uma característica real do processo, não uma falha ou limitação do sistema.

## Fluxo de trabalho

**Se o usuário já der um número de processo específico (ex.: "traga detalhes do processo 4022559-39.2026.8.26.0011" ou responder apontando pra um processo de uma mensagem anterior), chame detalhar_processo DIRETO com esse número — NUNCA chame buscar_processos_novos nesse caso.** buscar_processos_novos é só para quando o usuário pede uma prospecção por comarca/classe/período (ainda não tem um número em mãos) — chamá-la sem necessidade pode disparar indexação de vários dias de PDF e demorar muito à toa.

Para prospecção (usuário sem número de processo ainda):
1. Primeiro chame **buscar_processos_novos** com os filtros que o usuário pediu (comarca, classe, período — se o usuário não disser datas, não precisa informar, o sistema usa os últimos 30 dias por padrão).
2. Se encontrar resultados, escolha os até 3 mais relevantes e chame **detalhar_processo** para TODOS eles DE UMA VEZ, na MESMA resposta (vários tool_use em paralelo) — NUNCA um de cada vez em respostas/turnos separados. Cada turno extra custa uma chamada inteira ao modelo + espera de rede; pedir os 3 juntos é muito mais rápido que pedir 1, esperar, pedir o próximo, esperar de novo.
3. Responda resumindo os achados: quantos processos novos encontrados, comarca/vara/classe de cada, e destaque o nome da parte passiva (réu/executado) quando disponível — é o alvo da prospecção. Para os poucos casos sem nada ainda disponível, mencione o link "Ver no eproc" do card como o caminho pra ver os detalhes agora.
4. Se não encontrar nada, sugira ampliar a comarca ou a classe processual.

Nunca peça confirmação ao usuário entre uma chamada de ferramenta e outra — encadeie automaticamente. Priorize sempre o menor número de turnos possível: bata o máximo de tool_use que fizer sentido na mesma resposta, em vez de espalhar por várias respostas sequenciais.

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
      'Consulta o DJEN Nacional (e, como alternativa, o DataJud) para um número de processo específico, trazendo nome das partes, classe e órgão. Costuma funcionar mesmo para processos recém-distribuídos.',
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

/** Deduplica destinatários pelo par nome+polo (a mesma parte pode aparecer em várias comunicações). */
function deduplicarPartes(todas: Array<{ nome: string; polo: string }>): Array<{ nome: string; polo: string }> {
  const vistos = new Set<string>();
  const resultado: Array<{ nome: string; polo: string }> = [];
  for (const p of todas) {
    const chave = `${p.polo}::${p.nome}`;
    if (!vistos.has(chave) && p.nome && p.nome !== 'SIGILO') {
      vistos.add(chave);
      resultado.push(p);
    }
  }
  return resultado;
}

async function execDetalharProcesso(input: { numeroProcesso: string }): Promise<{ summary: string; processo: ProcessoCard | null }> {
  const linkEproc = eprocConsultaPublicaLink(input.numeroProcesso);

  // 1ª fonte: DJEN Nacional — busca nativa por numeroProcesso, sem CAPTCHA, cobre
  // processos recém-distribuídos (o campo `destinatarios` já vem com nome das partes
  // mesmo no item "Lista de distribuição", cujo texto não tem nomes).
  try {
    const comunicacoes = await buscarComunicacoesPorNumeroProcesso(input.numeroProcesso);
    if (comunicacoes.length > 0) {
      const maisRecente = comunicacoes[comunicacoes.length - 1];
      const destinatariosBrutos = comunicacoes.flatMap((c) => c.destinatarios.map((d) => ({ nome: d.nome, polo: d.polo })));
      const sigiloso = destinatariosBrutos.some((d) => d.nome === 'SIGILO');
      const partes = deduplicarPartes(destinatariosBrutos);

      const processo: ProcessoCard = {
        numeroProcesso: maisRecente.numeroProcesso,
        comarca: maisRecente.nomeOrgao,
        vara: maisRecente.nomeOrgao,
        classe: maisRecente.nomeClasse,
        dataDistribuicao: comunicacoes[0].dataDisponibilizacao,
        partes: partes.length > 0 ? partes : undefined,
        detalhado: true,
        linkEproc,
      };

      return {
        summary: JSON.stringify({
          encontradoNoDJEN: true,
          numeroProcesso: processo.numeroProcesso,
          classe: processo.classe,
          orgao: processo.comarca,
          partes: processo.partes,
          processoSigiloso: sigiloso || undefined,
          instrucao: sigiloso
            ? 'O nome das partes não está disponível porque o processo está em SEGREDO DE JUSTIÇA — informe isso claramente ao usuário, não é falha do sistema.'
            : undefined,
          comunicacoesEncontradas: comunicacoes.map((c) => ({ tipo: c.tipoComunicacao, data: c.dataDisponibilizacao })),
          linkEproc,
        }),
        processo,
      };
    }
  } catch {
    // DJEN indisponível — cai para DataJud abaixo
  }

  // 2ª fonte (fallback): DataJud do CNJ — às vezes tem assuntos/movimentações que o DJEN não traz.
  try {
    const { hits } = await queryTribunal(TJSP_TRIBUNAL, { numeroProcesso: input.numeroProcesso }, 0, 1);
    const hit = hits[0];
    if (!hit) {
      return {
        summary: JSON.stringify({
          encontradoNoDJEN: false,
          encontradoNoDataJud: false,
          numeroProcesso: input.numeroProcesso,
          linkEproc,
          instrucao:
            'Não encontrado no DJEN nem no DataJud (cobertura/sincronização irregular, sem prazo previsível — não invente prazo). ' +
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
        encontradoNoDJEN: false,
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
        erro: `Erro ao consultar DJEN/DataJud: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
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

    // Executa todas as tool calls do turno em paralelo — Claude pode pedir várias
    // de uma vez (ex.: detalhar_processo para 3 processos diferentes); rodar em
    // série multiplicava a latência por chamada (cada uma leva ~1-3s de rede).
    const execucoes = await Promise.all(
      toolUseBlocks.map((block) => executeTool(block.name, block.input as Record<string, unknown>)),
    );
    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block, i) => {
      acumular(execucoes[i].processos);
      return { type: 'tool_result', tool_use_id: block.id, content: execucoes[i].summary };
    });

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
