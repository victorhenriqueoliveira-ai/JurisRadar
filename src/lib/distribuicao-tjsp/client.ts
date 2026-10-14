/**
 * Distribuição TJSP Client — localização e download dos PDFs da "Lista de
 * Distribuição" (eproc, Primeira Instância/Colégio Recursal), publicados em
 * https://www.tjsp.jus.br/Processos/Comunicados/ListaDistribuicao
 *
 * A página não expõe uma API — é HTML paginado (~5 dias por página). Cada bloco
 * `.comunicado` tem um `<h3>` com o texto "PROCESSOS DISTRIBUÍDOS NO EPROC -
 * DD/MM/YYYY" (a data de DISTRIBUIÇÃO, diferente da `<time>` do bloco pai, que é
 * a data de PUBLICAÇÃO da lista — normalmente D+1) e uma lista de links por
 * categoria (`title="Primeira Instância/Colégio Recursal"`, "Segunda Instância",
 * "Execução Fiscal"). O href do link já é a URL final de download do PDF
 * (`api.tjsp.jus.br/Handlers/Handler/FileFetch.ashx?codigo=NNNNN`).
 *
 * Confirmado empiricamente em 2026-10-13: ~5 dias por página, códigos de arquivo
 * não são previsíveis/sequenciais por data — é necessário resolver via HTML.
 *
 * Parsing via regex (não jsdom — dependência apenas de teste no projeto, evitada
 * em runtime): a estrutura é simples e estável (confirmada via curl em produção),
 * cada bloco de dia é um `<h3>...PROCESSOS DISTRIBUÍDOS NO EPROC - DD/MM/YYYY...`
 * seguido de uma lista `<a class="UrlExternaTJSP" href="..." title="...">`.
 */

export class DistribuicaoTjspNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistribuicaoTjspNotFoundError';
  }
}

const LISTING_URL = 'https://www.tjsp.jus.br/Processos/Comunicados/ListaDistribuicao';
/** Limite de páginas a varrer (cada página cobre ~5 dias) antes de desistir */
const MAX_PAGINAS = 20;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,*/*',
};

/** Converte "YYYY-MM-DD" para "DD/MM/YYYY" (formato usado no texto do h3 do TJSP) */
function toBrDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Resolve o `codigo` do arquivo PDF da Lista de Distribuição (eproc, Primeira
 * Instância/Colégio Recursal) para uma data de distribuição específica,
 * varrendo as páginas da listagem do TJSP até encontrar o bloco correspondente.
 *
 * @param isoDate  Data de distribuição no formato ISO 8601 "YYYY-MM-DD"
 * @returns        Código numérico usado em `FileFetch.ashx?codigo=`
 * @throws {DistribuicaoTjspNotFoundError} Se a data não for encontrada em até `MAX_PAGINAS` páginas
 */
export async function resolveCodigoArquivo(isoDate: string): Promise<string> {
  const targetBr = toBrDate(isoDate);

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const url = pagina === 1 ? LISTING_URL : `${LISTING_URL}?pagina=${pagina}&tipoDestino=3441`;
    const response = await fetch(url, { headers: BROWSER_HEADERS });

    if (!response.ok) {
      throw new Error(`Distribuição TJSP: falha ao buscar listagem (HTTP ${response.status}) em ${url}`);
    }

    const html = await response.text();

    // Divide o HTML em blocos por ocorrência de `<h3>` (um por dia/sistema publicado)
    const h3Regex = /<h3>[\s\S]*?<\/h3>/g;
    const h3Matches = Array.from(html.matchAll(h3Regex));

    const datasDaPagina: string[] = [];

    for (let i = 0; i < h3Matches.length; i++) {
      const h3 = h3Matches[i];
      const titulo = h3[0];
      if (!titulo.toUpperCase().includes('EPROC')) continue; // ignora blocos do sistema SAJ

      const dataMatch = titulo.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (!dataMatch) continue;
      datasDaPagina.push(dataMatch[1]);
      if (dataMatch[1] !== targetBr) continue;

      // Conteúdo do bloco: do fim deste <h3> até o início do próximo (ou fim da página)
      const blockStart = h3.index! + h3[0].length;
      const blockEnd = i + 1 < h3Matches.length ? h3Matches[i + 1].index! : html.length;
      const block = html.slice(blockStart, blockEnd);

      const linkMatch = block.match(
        /<a class="UrlExternaTJSP" href="([^"]+)" title="Primeira Inst&#226;ncia\/Col&#233;gio Recursal">/,
      );
      if (!linkMatch) continue; // data existe mas categoria "Primeira Instância" não foi publicada

      const codigo = new URL(linkMatch[1]).searchParams.get('codigo');
      if (!codigo) continue;

      return codigo;
    }

    // Páginas são ordenadas da mais recente para a mais antiga — se a página mais
    // antiga já varrida tem data anterior à alvo, não há motivo para continuar.
    if (datasDaPagina.length > 0) {
      const maisAntiga = datasDaPagina[datasDaPagina.length - 1];
      const [d, m, y] = maisAntiga.split('/');
      const [td, tm, ty] = targetBr.split('/');
      if (`${y}${m}${d}` < `${ty}${tm}${td}`) break;
    }
  }

  throw new DistribuicaoTjspNotFoundError(
    `Distribuição TJSP: data ${isoDate} não encontrada na listagem (varridas ${MAX_PAGINAS} páginas)`,
  );
}

/**
 * Baixa o PDF da Lista de Distribuição a partir do `codigo` resolvido por
 * `resolveCodigoArquivo`.
 *
 * @param codigo  Código do arquivo (query param `codigo` do FileFetch.ashx)
 * @returns       Buffer contendo o PDF (magic bytes %PDF)
 */
export async function downloadListaDistribuicao(codigo: string): Promise<Buffer> {
  const url = `https://api.tjsp.jus.br/Handlers/Handler/FileFetch.ashx?codigo=${codigo}`;
  const response = await fetch(url, { headers: BROWSER_HEADERS });

  if (!response.ok) {
    throw new Error(`Distribuição TJSP: falha ao baixar PDF (HTTP ${response.status}) codigo=${codigo}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
    throw new Error(`Distribuição TJSP: resposta não é um PDF válido (codigo=${codigo})`);
  }
  return buffer;
}
