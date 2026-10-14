/**
 * Distribuição TJSP Parser — extração de linhas da Lista de Distribuição (eproc,
 * Primeira Instância/Colégio Recursal) via pdf-parse com acesso posicional (x,y)
 * aos itens de texto (pdf.js `getTextContent`).
 *
 * Por que posicional e não `pdf-parse` em modo texto corrido (como o parser do DJE):
 * a Lista de Distribuição é uma TABELA (Comarca | Vara | Nº processo | Classe).
 * O texto corrido do pdf-parse perde o alinhamento das colunas — quando duas colunas
 * terminam/começam na mesma linha horizontal do PDF, o texto fica concatenado sem
 * espaço (ex.: "ColinaAnexo do Juizado..."), tornando impossível separar
 * Comarca/Vara/Classe de forma confiável por regex em texto puro.
 *
 * Em vez disso, usamos `pagerender` do pdf-parse para interceptar o `pageData` do
 * pdf.js e ler `getTextContent()` diretamente, preservando a posição (x,y) de cada
 * fragmento de texto. As colunas têm posições X fixas no template do TJSP:
 *   Comarca ≈ x74 | Vara ≈ x193 | Nº processo ≈ x386 | Classe ≈ x508
 * Cada linha da tabela é ancorada pelo início do número do processo (padrão
 * `NNNNNNN-`, primeira metade do CNJ) na coluna "Nº processo"; os demais itens
 * entre duas âncoras consecutivas (mesma página) pertencem à mesma linha da tabela.
 */

import type { DistribuicaoTjspRow } from './types';

type PdfTextItem = { str: string; transform: number[] };
type PdfTextContent = { items: PdfTextItem[] };
type PdfPageData = { getTextContent: () => Promise<PdfTextContent> };
type PdfParseOptions = {
  pagerender?: (pageData: PdfPageData) => Promise<string>;
};
type PdfParseFn = (buffer: Buffer, options?: PdfParseOptions) => Promise<{ text: string; numpages: number }>;

/** Marca o início de um número de processo: primeira metade do CNJ (ex.: "4003432-") */
const PROCESS_NUMBER_START = /^\d{7}-$/;
/** Segunda metade do CNJ (ex.: "02.2026.8.26.0081") */
const PROCESS_NUMBER_REST = /^\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

/** Faixas de X (pontos PDF) observadas no template oficial da Lista de Distribuição TJSP */
const COLUMN_RANGES = {
  comarca: [0, 150] as const,
  vara: [150, 300] as const,
  processo: [300, 450] as const,
  classe: [450, Infinity] as const,
};

type Column = keyof typeof COLUMN_RANGES;

function columnForX(x: number): Column | null {
  for (const [col, [min, max]] of Object.entries(COLUMN_RANGES) as [Column, readonly [number, number]][]) {
    if (x >= min && x < max) return col;
  }
  return null;
}

type PositionedItem = { str: string; x: number; y: number };

/**
 * Extrai itens de texto com posição (x, y) de uma página de PDF via pdf.js.
 * Usado como callback `pagerender` do pdf-parse.
 */
function extractPositionedItems(pageItems: PdfTextItem[]): PositionedItem[] {
  return pageItems
    .map((it) => ({
      str: it.str,
      x: Math.round(it.transform[4]),
      y: Math.round(it.transform[5]),
    }))
    .filter((it) => it.str.trim().length > 0);
}

/**
 * Agrupa itens posicionados de UMA página em linhas da tabela, ancoradas pelo
 * início do número do processo (coluna "processo", padrão `NNNNNNN-`).
 * Itens acima da primeira âncora (título/cabeçalho da página) são descartados.
 */
function groupItemsIntoRows(items: PositionedItem[]): DistribuicaoTjspRow[] {
  const anchors = items
    .filter((it) => columnForX(it.x) === 'processo' && PROCESS_NUMBER_START.test(it.str.trim()))
    .sort((a, b) => b.y - a.y); // topo → base (y decresce no PDF)

  if (anchors.length === 0) return [];

  const rows: DistribuicaoTjspRow[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const top = anchors[i].y;
    const bottom = i + 1 < anchors.length ? anchors[i + 1].y : -Infinity;

    // Itens desta linha: y <= top (inclui a própria âncora) e y > bottom (exclui a próxima âncora)
    const rowItems = items.filter((it) => it.y <= top && it.y > bottom);

    const byColumn: Record<Column, PositionedItem[]> = {
      comarca: [],
      vara: [],
      processo: [],
      classe: [],
    };
    for (const it of rowItems) {
      const col = columnForX(it.x);
      if (col) byColumn[col].push(it);
    }

    const joinColumn = (col: Column): string =>
      byColumn[col]
        .sort((a, b) => b.y - a.y)
        .map((it) => it.str.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Número do processo: junta a primeira metade (NNNNNNN-) com a segunda (NN.AAAA.D.TR.OOOO)
    const processoParts = byColumn.processo.sort((a, b) => b.y - a.y).map((it) => it.str.trim());
    const start = processoParts.find((p) => PROCESS_NUMBER_START.test(p));
    const rest = processoParts.find((p) => PROCESS_NUMBER_REST.test(p));
    if (!start || !rest) continue; // linha malformada — pula (não deveria ocorrer no template padrão)
    const numeroProcesso = `${start}${rest}`;

    const comarca = joinColumn('comarca') || null;
    const vara = joinColumn('vara') || null;
    const classe = joinColumn('classe');
    if (!classe) continue; // linha sem classe — pula

    rows.push({ numeroProcesso, comarca, vara, classe });
  }

  return rows;
}

/**
 * Extrai todas as linhas da Lista de Distribuição TJSP (eproc, Primeira
 * Instância/Colégio Recursal) de um buffer PDF.
 *
 * @param buffer  Buffer contendo os bytes do PDF (magic bytes %PDF)
 * @returns       Linhas extraídas, na ordem em que aparecem no documento
 * @throws {Error} Se o buffer não for um PDF válido ou a extração falhar
 */
export async function parseDistribuicaoTjspPdf(buffer: Buffer): Promise<DistribuicaoTjspRow[]> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Distribuição TJSP Parser: buffer inválido — esperado Buffer não vazio contendo um PDF');
  }
  if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
    throw new Error('Distribuição TJSP Parser: buffer não é um PDF válido — magic bytes ausentes (esperado: %PDF)');
  }

  const allRows: DistribuicaoTjspRow[] = [];

  try {
    const { createRequire } = await import('module');
    const req = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = req('pdf-parse') as PdfParseFn;

    await pdfParse(buffer, {
      pagerender: async (pageData: PdfPageData) => {
        const textContent = await pageData.getTextContent();
        const items = extractPositionedItems(textContent.items);
        const rows = groupItemsIntoRows(items);
        allRows.push(...rows);
        return ''; // conteúdo textual da página não é usado — já extraímos via `items`
      },
    });
  } catch (error) {
    throw new Error(
      `Distribuição TJSP Parser: falha ao extrair PDF — ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return allRows;
}
