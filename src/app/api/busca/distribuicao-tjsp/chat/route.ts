import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { buscarProcessosNovos, defaultDateRange } from '@/lib/distribuicao-tjsp/search';
import { eprocConsultaPublicaLink } from '@/lib/distribuicao-tjsp/eproc-link';
import { queryTribunal } from '@/lib/datajud/client';
import { montarRequestDjen, parsearComunicacoesDjen, type DjenRawResponse } from '@/lib/djen/client';

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

// ─── Tipos ─────────────────────────────────────────────────────────────────────

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
  linkEproc: string;
}

/** Resultado do fetch do DJEN feito pelo NAVEGADOR (comunicaapi.pje.jus.br bloqueia IPs de servidor). */
type DjenFetchResults = Record<string, DjenRawResponse | { erro: string }>;

interface TurnoPendente {
  /** Conteúdo da resposta do assistant deste turno (contém os tool_use blocks). */
  assistantContent: Anthropic.ContentBlockParam[];
  /** tool_results já resolvidos neste turno (ex.: buscar_processos_novos, que roda no servidor). */
  toolResultsProntos: Array<{ toolUseId: string; content: string; processos: ProcessoCard[] }>;
  /** detalhar_processo aguardando o navegador buscar no DJEN. */
  pendentesDjen: Array<{ toolUseId: string; numeroProcesso: string }>;
}

interface PendingState {
  conversationMessages: Anthropic.MessageParam[];
  turno: TurnoPendente;
  turnsUsed: number;
  processosAcumulados: ProcessoCard[];
  /** Histórico "limpo" (user/assistant, sem tool_use/tool_result) anterior a esta pergunta — pra persistência. */
  messagesAnteriores: Anthropic.MessageParam[];
  /** Texto original da pergunta do usuário que disparou esta rodada. */
  userMessageOriginal: string;
}

// ─── Deduplicação de partes ───────────────────────────────────────────────────

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

// ─── Execução de ferramentas ───────────────────────────────────────────────────

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

/** Fallback via DataJud quando o DJEN (buscado pelo navegador) não trouxe nada ou falhou. */
async function execDetalharViaDataJud(numeroProcesso: string, linkEproc: string): Promise<{ summary: string; processo: ProcessoCard }> {
  try {
    const { hits } = await queryTribunal(TJSP_TRIBUNAL, { numeroProcesso }, 0, 1);
    const hit = hits[0];
    if (!hit) {
      return {
        summary: JSON.stringify({
          encontradoNoDJEN: false,
          encontradoNoDataJud: false,
          numeroProcesso,
          linkEproc,
          instrucao:
            'Não encontrado no DJEN nem no DataJud (cobertura/sincronização irregular, sem prazo previsível — não invente prazo). ' +
            'Responda ao usuário citando literalmente a URL em "linkEproc" acima como o link pra ver os detalhes agora na consulta pública oficial do TJSP (sistema eproc). Não sugira nenhuma outra URL.',
        }),
        processo: { numeroProcesso, detalhado: false, linkEproc },
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
      processo: { numeroProcesso, detalhado: false, linkEproc },
    };
  }
}

/**
 * Processa o resultado bruto do DJEN (já buscado pelo NAVEGADOR — comunicaapi.pje.jus.br
 * bloqueia IPs de servidor) para um número de processo. Cai para o DataJud se o DJEN
 * não trouxe nada ou o fetch do navegador falhou.
 */
async function processarResultadoDjen(
  numeroProcesso: string,
  resultado: DjenRawResponse | { erro: string },
): Promise<{ summary: string; processo: ProcessoCard }> {
  const linkEproc = eprocConsultaPublicaLink(numeroProcesso);

  if ('erro' in resultado) {
    return execDetalharViaDataJud(numeroProcesso, linkEproc);
  }

  const comunicacoes = parsearComunicacoesDjen(resultado, numeroProcesso);
  if (comunicacoes.length === 0) {
    return execDetalharViaDataJud(numeroProcesso, linkEproc);
  }

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

// ─── Execução de um turno: separa o que roda no servidor do que precisa do navegador ──

function acumular(destino: ProcessoCard[], vistos: Set<string>, lista: ProcessoCard[]) {
  for (const p of lista) {
    if (!vistos.has(p.numeroProcesso)) {
      vistos.add(p.numeroProcesso);
      destino.push(p);
    } else if (p.detalhado) {
      const idx = destino.findIndex((x) => x.numeroProcesso === p.numeroProcesso);
      if (idx >= 0) destino[idx] = p;
    }
  }
}

/**
 * Processa os tool_use blocks de UM turno: executa buscar_processos_novos no
 * servidor (não depende de IP bloqueado) e separa os detalhar_processo que
 * precisam do navegador. Retorna `aguardandoDjen` quando há pendências.
 */
async function processarTurno(
  toolUseBlocks: Anthropic.ToolUseBlock[],
): Promise<{
  toolResultsProntos: Array<{ toolUseId: string; content: string; processos: ProcessoCard[] }>;
  pendentesDjen: Array<{ toolUseId: string; numeroProcesso: string }>;
}> {
  const toolResultsProntos: Array<{ toolUseId: string; content: string; processos: ProcessoCard[] }> = [];
  const pendentesDjen: Array<{ toolUseId: string; numeroProcesso: string }> = [];

  await Promise.all(
    toolUseBlocks.map(async (block) => {
      if (block.name === 'buscar_processos_novos') {
        const { summary, processos } = await execBuscarProcessosNovos(block.input as Record<string, unknown>);
        toolResultsProntos.push({ toolUseId: block.id, content: summary, processos });
      } else if (block.name === 'detalhar_processo') {
        const { numeroProcesso } = block.input as { numeroProcesso: string };
        pendentesDjen.push({ toolUseId: block.id, numeroProcesso });
      } else {
        toolResultsProntos.push({ toolUseId: block.id, content: 'Ferramenta desconhecida.', processos: [] });
      }
    }),
  );

  return { toolResultsProntos, pendentesDjen };
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
    djenFetchResults?: DjenFetchResults;
    pendingState?: PendingState;
  };

  let conversationMessages: Anthropic.MessageParam[];
  let turnsUsed = 0;
  const processosAcumulados: ProcessoCard[] = [];
  const vistos = new Set<string>();
  let messagesAnteriores: Anthropic.MessageParam[];
  let userMessageOriginal: string;

  if (body.djenFetchResults && body.pendingState) {
    // Fase 2+: o navegador já buscou o DJEN — resolve o turno pendente e continua o loop.
    const { conversationMessages: msgs, turno, turnsUsed: usados, processosAcumulados: acumuladosAnteriores } = body.pendingState;
    conversationMessages = msgs;
    turnsUsed = usados;
    messagesAnteriores = body.pendingState.messagesAnteriores;
    userMessageOriginal = body.pendingState.userMessageOriginal;
    acumular(processosAcumulados, vistos, acumuladosAnteriores);
    for (const p of turno.toolResultsProntos) acumular(processosAcumulados, vistos, p.processos);

    const resultadosDjen = await Promise.all(
      turno.pendentesDjen.map(async (pend) => {
        const raw = body.djenFetchResults![pend.numeroProcesso];
        const { summary, processo } = await processarResultadoDjen(pend.numeroProcesso, raw ?? { erro: 'Resultado não enviado pelo navegador' });
        return { toolUseId: pend.toolUseId, content: summary, processos: [processo] };
      }),
    );
    for (const r of resultadosDjen) acumular(processosAcumulados, vistos, r.processos);

    const todosResultados = [...turno.toolResultsProntos, ...resultadosDjen];
    const toolResults: Anthropic.ToolResultBlockParam[] = todosResultados.map((r) => ({
      type: 'tool_result',
      tool_use_id: r.toolUseId,
      content: r.content,
    }));

    conversationMessages.push({ role: 'assistant', content: turno.assistantContent });
    conversationMessages.push({ role: 'user', content: toolResults });
  } else {
    // Fase 1: primeira mensagem do usuário nesta rodada.
    if (!body.userMessage?.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
    }
    messagesAnteriores = body.messages ?? [];
    userMessageOriginal = body.userMessage;
    conversationMessages = [...messagesAnteriores, { role: 'user', content: userMessageOriginal }];
  }

  let response = await client.messages.create(
    { model: MODEL, max_tokens: 1536, system: SYSTEM_PROMPT, tools, messages: conversationMessages },
    { signal: request.signal },
  );

  while (response.stop_reason === 'tool_use' && turnsUsed < MAX_TOOL_TURNS) {
    turnsUsed++;
    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const { toolResultsProntos, pendentesDjen } = await processarTurno(toolUseBlocks);

    if (pendentesDjen.length > 0) {
      // comunicaapi.pje.jus.br bloqueia IPs de servidor — pausa e pede ao navegador para buscar.
      const pendingState: PendingState = {
        conversationMessages,
        turno: { assistantContent: response.content, toolResultsProntos, pendentesDjen },
        turnsUsed,
        processosAcumulados,
        messagesAnteriores,
        userMessageOriginal,
      };
      return NextResponse.json({
        status: 'need_djen_fetch',
        pedidos: pendentesDjen.map((p) => ({
          numeroProcesso: p.numeroProcesso,
          ...montarRequestDjen(p.numeroProcesso),
        })),
        pendingState,
      });
    }

    for (const p of toolResultsProntos) acumular(processosAcumulados, vistos, p.processos);
    const toolResults: Anthropic.ToolResultBlockParam[] = toolResultsProntos.map((r) => ({
      type: 'tool_result',
      tool_use_id: r.toolUseId,
      content: r.content,
    }));

    conversationMessages.push({ role: 'assistant', content: response.content });
    conversationMessages.push({ role: 'user', content: toolResults });

    response = await client.messages.create(
      { model: MODEL, max_tokens: 1536, system: SYSTEM_PROMPT, tools, messages: conversationMessages },
      { signal: request.signal },
    );
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const assistantMessage = textBlock?.text ?? 'Não consegui gerar uma resposta.';

  // Histórico "limpo" para persistência/exibição — sem os turnos intermediários de tool_use/tool_result.
  const historyForClient: Anthropic.MessageParam[] = [
    ...messagesAnteriores,
    { role: 'user', content: userMessageOriginal },
    { role: 'assistant', content: assistantMessage },
  ];

  return NextResponse.json({
    message: assistantMessage,
    processos: processosAcumulados,
    messages: historyForClient,
  });
}
