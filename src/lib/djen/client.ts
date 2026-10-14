/**
 * DJEN Nacional Client — busca de comunicações por número de processo
 * (API pública do CNJ/PJe, sem CAPTCHA, sem autenticação).
 *
 * Usado para enriquecer processos da Lista de Distribuição TJSP com nome das
 * partes: confirmado empiricamente em 2026-10-14 que o campo `destinatarios[]`
 * da resposta já traz nome + polo de TODAS as partes, mesmo no item
 * `tipoComunicacao: "Lista de distribuição"` (cujo texto não tem nomes, mas o
 * campo estruturado tem) — isso cobre processos recém-distribuídos que o
 * DataJud ainda não indexou, sem depender do eproc (que exige Cloudflare
 * Turnstile e não pode ser automatizado).
 *
 * IMPORTANTE — bloqueio de IP de servidor: assim como `DjenIaChat.tsx`
 * (DJEN Nacional) já documenta, `comunicaapi.pje.jus.br` bloqueia/filtra
 * requisições vindas de IPs de datacenter (confirmado em produção na Vercel
 * em 2026-10-14: funciona perfeitamente de uma máquina local, mas retorna
 * vazio/bloqueado a partir do servidor). Por isso o fetch real DEVE ser feito
 * do navegador do usuário — `montarRequestDjen` monta a URL+headers,
 * `parsearComunicacoesDjen` processa o JSON já obtido (função pura, sem
 * fetch), e o servidor (`chat/route.ts`) nunca chama `fetch` para este host
 * diretamente — ele pausa o fluxo e pede ao cliente para buscar.
 */

const DJEN_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

export interface DjenDestinatario {
  nome: string;
  polo: string; // "A" = Ativo, "P" = Passivo, "T" = Terceiro, "D" = Outros
}

export interface DjenComunicacao {
  id: number;
  dataDisponibilizacao: string;
  tipoComunicacao: string;
  nomeOrgao: string;
  nomeClasse: string;
  numeroProcesso: string;
  destinatarios: DjenDestinatario[];
}

interface RawItem {
  id?: number;
  data_disponibilizacao?: string;
  tipoComunicacao?: string;
  nomeOrgao?: string;
  nomeClasse?: string;
  numeroprocessocommascara?: string;
  destinatarios?: DjenDestinatario[];
}

export interface DjenRawResponse {
  items?: RawItem[];
}

/** URL + headers para buscar comunicações de um processo — usado pelo CLIENTE (browser) para o fetch real. */
export function montarRequestDjen(numeroProcesso: string): { url: string; headers: Record<string, string> } {
  const params = new URLSearchParams({
    numeroProcesso,
    itensPorPagina: '5',
    pagina: '1',
  });
  return {
    url: `${DJEN_BASE}?${params.toString()}`,
    headers: {
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://comunica.pje.jus.br/',
    },
  };
}

/**
 * Processa o JSON bruto (já obtido via fetch do navegador) em comunicações
 * estruturadas, ordenadas da mais antiga para a mais recente. Função pura —
 * não faz nenhuma requisição de rede, pode rodar no servidor com segurança.
 */
export function parsearComunicacoesDjen(raw: DjenRawResponse, numeroProcessoFallback: string): DjenComunicacao[] {
  const items = raw.items ?? [];
  return items
    .map((item) => ({
      id: item.id ?? 0,
      dataDisponibilizacao: item.data_disponibilizacao ?? '',
      tipoComunicacao: item.tipoComunicacao ?? '',
      nomeOrgao: item.nomeOrgao ?? '',
      nomeClasse: item.nomeClasse ?? '',
      numeroProcesso: item.numeroprocessocommascara ?? numeroProcessoFallback,
      destinatarios: item.destinatarios ?? [],
    }))
    .sort((a, b) => a.dataDisponibilizacao.localeCompare(b.dataDisponibilizacao));
}
