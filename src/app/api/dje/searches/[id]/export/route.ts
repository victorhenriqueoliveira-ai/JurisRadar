import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getDjeSearch, searchPublications } from '@/db/dje';
import type { DjeSearchResult } from '@/lib/dje/types';

/**
 * Escapa um valor de célula CSV conforme RFC 4180.
 * Envolve em aspas duplas quando necessário e duplica aspas internas.
 */
function escapeCell(value: string | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Converte uma publicação DJE em linha CSV.
 * Remove tags HTML do snippet (gerado pelo ts_headline do Postgres).
 *
 * Colunas: numero_cnj, instancia, vara_camara, data_publicacao, caderno, texto_completo
 */
function djePublicationToCsvRow(result: DjeSearchResult): string {
  const textoSemHtml = result.snippet.replace(/<[^>]+>/g, '');
  return [
    escapeCell(result.processNumber),
    escapeCell(result.instance),
    escapeCell(result.court),
    escapeCell(result.publicationDate),
    escapeCell(String(result.caderno)),
    escapeCell(textoSemHtml),
  ].join(',');
}

/**
 * Gera um ReadableStream CSV a partir dos resultados DJE.
 *
 * Primeira linha é sempre o cabeçalho de colunas.
 * O stream é gerado de forma lazy (pull-based) para evitar bufferizar em memória.
 */
function djeToCsvStream(results: DjeSearchResult[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const headerLine = 'numero_cnj,instancia,vara_camara,data_publicacao,caderno,texto_completo\r\n';
  let index = 0;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(headerLine));
    },
    pull(controller) {
      if (index < results.length) {
        const row = djePublicationToCsvRow(results[index]) + '\r\n';
        controller.enqueue(encoder.encode(row));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * GET /api/dje/searches/[id]/export
 *
 * Re-executa a query DJE sem paginação e retorna stream CSV para download.
 * O snippet das publicações tem tags HTML removidas no CSV.
 *
 * Headers de resposta:
 * - Content-Type: text/csv; charset=utf-8
 * - Content-Disposition: attachment; filename="dje-{id}.csv"
 *
 * Status HTTP:
 * - 200 — stream CSV
 * - 401 — não autenticado
 * - 404 — busca não encontrada ou pertence a outro usuário
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.id;
  const { id } = await params;

  // Verifica ownership — retorna null se não pertencer ao usuário
  const search = await getDjeSearch(id, userId);
  if (!search) {
    return new Response(JSON.stringify({ error: 'Busca não encontrada' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const searchParamsObj = {
    term: search.term,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  };

  // Busca todos os resultados sem paginação (limite alto para export)
  const { results } = await searchPublications(searchParamsObj, 1, 10000, userId);

  const stream = djeToCsvStream(results);

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dje-${id}.csv"`,
    },
  });
}
