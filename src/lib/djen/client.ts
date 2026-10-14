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
 * `numeroProcesso` é filtro nativo documentado na API (funciona mesmo sem o
 * parâmetro `texto`, ao contrário de outros filtros pós-fetch usados em
 * `src/app/api/djen-nacional/chat/route.ts`).
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

/**
 * Busca todas as comunicações já publicadas no DJEN para um número de
 * processo específico. Retorna em ordem cronológica (mais antiga primeiro) —
 * a primeira é tipicamente a "Lista de distribuição", que já traz as partes.
 */
export async function buscarComunicacoesPorNumeroProcesso(numeroProcesso: string): Promise<DjenComunicacao[]> {
  const params = new URLSearchParams({
    numeroProcesso,
    itensPorPagina: '5',
    pagina: '1',
  });

  const response = await fetch(`${DJEN_BASE}?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JurisRadar/1.0)',
      Accept: 'application/json, text/plain, */*',
      Referer: 'https://comunica.pje.jus.br/',
      Origin: 'https://comunica.pje.jus.br',
    },
  });

  if (!response.ok) {
    throw new Error(`DJEN: resposta inesperada HTTP ${response.status}`);
  }

  const data = (await response.json()) as { items?: RawItem[] };
  const items = data.items ?? [];

  return items
    .map((item) => ({
      id: item.id ?? 0,
      dataDisponibilizacao: item.data_disponibilizacao ?? '',
      tipoComunicacao: item.tipoComunicacao ?? '',
      nomeOrgao: item.nomeOrgao ?? '',
      nomeClasse: item.nomeClasse ?? '',
      numeroProcesso: item.numeroprocessocommascara ?? numeroProcesso,
      destinatarios: item.destinatarios ?? [],
    }))
    .sort((a, b) => a.dataDisponibilizacao.localeCompare(b.dataDisponibilizacao));
}
