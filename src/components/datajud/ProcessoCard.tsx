'use client';

import { useState } from 'react';
import type { ProcessoResult } from '@/lib/datajud/types';

interface ProcessoCardProps {
  processo: ProcessoResult;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  // DataJud: "yyyyMMddHHmmss" ou ISO
  const clean = dateStr.length === 14
    ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    : dateStr;
  const d = new Date(clean);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function stripFormatting(numero: string): string {
  return numero.replace(/[.\-/]/g, '');
}

const GRAU_LABEL: Record<string, string> = {
  G1: '1ª Instância',
  G2: '2ª Instância',
  JE: 'Juizado Especial',
  SUP: 'Superior',
};

export default function ProcessoCard({ processo }: ProcessoCardProps) {
  const [expanded, setExpanded] = useState(false);

  const {
    numero,
    orgaoJulgador,
    assunto,
    assuntos,
    classe,
    grau,
    tribunal,
    dataDistribuicao,
    ultimaMovimentacao,
    movimentos,
  } = processo;

  const stripped = stripFormatting(numero);
  const tjspUrl = `https://esaj.tjsp.jus.br/cpopg/search.do?cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=${stripped}&foroNumeroUnificado=0000&dadosConsulta.valorConsultaNuUnificado=${numero}&dadosConsulta.valorConsulta=&dadosConsulta.tipoNuUnificado=UNIFICADO`;

  const extraAssuntos = (assuntos ?? []).slice(1);
  const partesAtivas = processo.partes?.filter((p) => p.polo === 'ativo') ?? [];
  const partesPassivas = processo.partes?.filter((p) => p.polo === 'passivo') ?? [];
  const hasMore = (movimentos?.length ?? 0) > 1 || extraAssuntos.length > 0 || (processo.partes?.length ?? 0) > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Cabeçalho sempre visível */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 font-mono truncate" data-testid="processo-numero">
              {numero}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              {orgaoJulgador && (
                <span data-testid="orgao-julgador">{orgaoJulgador}</span>
              )}
              {orgaoJulgador && (assunto || classe) && <span aria-hidden="true">·</span>}
              {assunto && (
                <span data-testid="assunto">{assunto}</span>
              )}
              {assunto && classe && <span aria-hidden="true">·</span>}
              {classe && (
                <span data-testid="classe">{classe}</span>
              )}
              {(orgaoJulgador || assunto || classe) && <span aria-hidden="true">·</span>}
              <span data-testid="data-distribuicao">Dist.: {formatDate(dataDistribuicao)}</span>
            </div>

            {ultimaMovimentacao && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Última mov.: </span>
                {formatDate(ultimaMovimentacao.data)} — {ultimaMovimentacao.descricao}
              </div>
            )}
          </div>

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

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            {expanded ? 'Ver menos ▲' : 'Ver mais ▼'}
          </button>
        )}
      </div>

      {/* Seção expandida */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Informações gerais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-400 font-medium uppercase tracking-wide mb-0.5">Tribunal</p>
              <p className="text-gray-800">{tribunal || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium uppercase tracking-wide mb-0.5">Grau</p>
              <p className="text-gray-800">{GRAU_LABEL[grau] ?? grau ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium uppercase tracking-wide mb-0.5">Distribuição</p>
              <p className="text-gray-800">{formatDate(dataDistribuicao)}</p>
            </div>
          </div>

          {/* Partes */}
          {(partesAtivas.length > 0 || partesPassivas.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {partesAtivas.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                    Polo Ativo
                  </p>
                  <ul className="space-y-2">
                    {partesAtivas.map((p, i) => (
                      <li key={i}>
                        <p className="text-xs font-medium text-gray-800">{p.nome}</p>
                        {p.advogados?.map((adv, j) => (
                          <p key={j} className="text-xs text-gray-500 mt-0.5">
                            ⚖ {adv.nome}{adv.oab ? ` (OAB ${adv.oab})` : ''}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {partesPassivas.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                    Polo Passivo
                  </p>
                  <ul className="space-y-2">
                    {partesPassivas.map((p, i) => (
                      <li key={i}>
                        <p className="text-xs font-medium text-gray-800">{p.nome}</p>
                        {p.advogados?.map((adv, j) => (
                          <p key={j} className="text-xs text-gray-500 mt-0.5">
                            ⚖ {adv.nome}{adv.oab ? ` (OAB ${adv.oab})` : ''}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Assuntos extras */}
          {extraAssuntos.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                Assuntos adicionais
              </p>
              <div className="flex flex-wrap gap-1">
                {extraAssuntos.map((a) => (
                  <span
                    key={a}
                    className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de movimentações */}
          {(movimentos?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
                Histórico de movimentações ({movimentos!.length})
              </p>
              <ol className="relative border-l border-gray-200 space-y-3 ml-2">
                {movimentos!.map((mov, i) => (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-blue-400 bg-white" />
                    <p className="text-xs text-gray-400">{formatDate(mov.data)}</p>
                    <p className="text-xs text-gray-800 mt-0.5">{mov.descricao}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
