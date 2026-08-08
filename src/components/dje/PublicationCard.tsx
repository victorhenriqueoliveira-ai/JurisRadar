'use client';

export interface Publication {
  id: string;
  processNumber: string;
  instance: string | null;
  court: string | null;
  publishedAt: string;
  snippet: string;
}

interface PublicationCardProps {
  publication: Publication;
}

/**
 * Formata data ISO (YYYY-MM-DD ou ISO completo) para DD/MM/YYYY.
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata instância numérica para texto legível.
 */
function formatInstance(instance: string | null): string {
  if (!instance) return '—';
  if (instance === '1' || instance === 'PRIMEIRA' || instance.includes('1')) return '1ª Instância';
  if (instance === '2' || instance === 'SEGUNDA' || instance.includes('2')) return '2ª Instância';
  return instance;
}

/**
 * Remove formatação do número CNJ para uso em URLs.
 */
function stripProcessNumberFormatting(processNumber: string): string {
  return processNumber.replace(/[.\-/]/g, '');
}

/**
 * Card de publicação DJE com número CNJ, instância, vara/câmara,
 * data, snippet com destaque e link para consulta no TJSP.
 */
export default function PublicationCard({ publication }: PublicationCardProps) {
  const { processNumber, instance, court, publishedAt, snippet } = publication;

  const processNumberStripped = stripProcessNumberFormatting(processNumber);
  const tjspUrl = `https://esaj.tjsp.jus.br/cpopg/search.do?cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=${processNumberStripped}&foroNumeroUnificado=0000&dadosConsulta.valorConsultaNuUnificado=${processNumber}&dadosConsulta.valorConsulta=&dadosConsulta.tipoNuUnificado=UNIFICADO`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Número CNJ */}
          <p className="text-sm font-semibold text-gray-900 truncate" data-testid="process-number">
            {processNumber}
          </p>

          {/* Metadados */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span data-testid="instance">{formatInstance(instance)}</span>
            <span aria-hidden="true">·</span>
            <span data-testid="court">{court ?? '—'}</span>
            <span aria-hidden="true">·</span>
            <span data-testid="published-at">{formatDate(publishedAt)}</span>
          </div>

          {/* Snippet com destaque */}
          <div className="mt-2 text-sm text-gray-700 leading-relaxed">
            <span
              data-testid="snippet"
              dangerouslySetInnerHTML={{ __html: snippet }}
            />
          </div>
        </div>

        {/* Link TJSP */}
        <a
          href={tjspUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
          data-testid="tjsp-link"
        >
          Consultar no TJSP
        </a>
      </div>
    </div>
  );
}
