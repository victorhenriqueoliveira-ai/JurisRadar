'use client';

import React from 'react';
import { EmptyStateIllustrated } from '@/components/ui-custom/EmptyStateIllustrated';
import { PulsingBadge } from '@/components/ui-custom/PulsingBadge';

export interface ProcessoRow {
  id: string;
  numeroCnj: string;
  tribunal?: string | null;
  areaDireito?: string | null;
  status?: string | null;
  ultimaMovimentacao?: string | null;
  proximoPrazo?: string | null;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  createdAt?: string | Date | null;
}

export type SortField =
  | 'numeroCnj'
  | 'tribunal'
  | 'areaDireito'
  | 'status'
  | 'ultimaMovimentacao'
  | 'proximoPrazo'
  | 'responsavelNome';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

interface ProcessoTableProps {
  processos: ProcessoRow[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onRowClick?: (processo: ProcessoRow) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  lastSync?: Date | null;
}

const COLUMNS: { field: SortField; label: string }[] = [
  { field: 'numeroCnj', label: 'Número CNJ' },
  { field: 'tribunal', label: 'Tribunal' },
  { field: 'areaDireito', label: 'Área' },
  { field: 'status', label: 'Status' },
  { field: 'ultimaMovimentacao', label: 'Última movimentação' },
  { field: 'proximoPrazo', label: 'Próximo prazo' },
  { field: 'responsavelNome', label: 'Responsável' },
];

function isUrgent(processo: ProcessoRow): boolean {
  if (!processo.proximoPrazo) return false;
  const prazo = new Date(processo.proximoPrazo);
  if (isNaN(prazo.getTime())) return false;
  const diffDays = (prazo.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays <= 5;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-BR');
}

const STATUS_COLORS: Record<string, string> = {
  ativo: '#16a34a',
  suspenso: '#ca8a04',
  encerrado: '#6b7280',
  arquivado: '#9ca3af',
};

export function ProcessoTable({
  processos: data,
  sort,
  onSortChange,
  onRowClick,
  onLoadMore,
  hasMore,
  loadingMore,
  lastSync,
}: ProcessoTableProps) {
  const handleSort = (field: SortField) => {
    if (sort.field === field) {
      onSortChange({ field, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ field, direction: 'asc' });
    }
  };

  const sortIcon = (field: SortField) => {
    if (sort.field !== field) return <span aria-hidden="true" style={{ opacity: 0.3 }}>↕</span>;
    return (
      <span aria-hidden="true" data-direction={sort.direction}>
        {sort.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div data-testid="processo-table-wrapper" className="hidden md:block">
      {data.length === 0 ? (
        <EmptyStateIllustrated
          title="Nenhum processo encontrado"
          description="Tente ajustar os filtros ou adicione processos ao CRM."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-[18px] border border-[#e5e7eb] bg-white">
            <table
              data-testid="processo-table"
              className="w-full text-sm border-collapse"
            >
              <thead>
                <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.field}
                      onClick={() => handleSort(col.field)}
                      className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[.06em] text-[#9ca3af] cursor-pointer select-none whitespace-nowrap hover:text-[#0f2d5e] transition-colors"
                      aria-sort={
                        sort.field === col.field
                          ? sort.direction === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label} {sortIcon(col.field)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((processo) => {
                  const urgent = isUrgent(processo);
                  const statusColor = STATUS_COLORS[processo.status ?? ''] ?? '#6b7280';

                  return (
                    <tr
                      key={processo.id}
                      data-testid="processo-row"
                      onClick={() => onRowClick?.(processo)}
                      className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors cursor-pointer last:border-0"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-[#0f2d5e] font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          {processo.numeroCnj}
                          {urgent && <PulsingBadge count={1} />}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#374151]">{processo.tribunal ?? '—'}</td>
                      <td className="px-4 py-3 text-[#374151]">{processo.areaDireito ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: `${statusColor}18`,
                            color: statusColor,
                            border: `1px solid ${statusColor}33`,
                          }}
                        >
                          {processo.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#374151] max-w-[12rem] truncate" title={processo.ultimaMovimentacao ?? ''}>
                        {processo.ultimaMovimentacao ?? '—'}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap font-medium ${urgent ? 'text-[#dc2626]' : 'text-[#374151]'}`}
                      >
                        {formatDate(processo.proximoPrazo)}
                      </td>
                      <td className="px-4 py-3 text-[#374151]">{processo.responsavelNome ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                data-testid="load-more"
                className="px-6 py-2 rounded-xl border border-[#e5e7eb] bg-white text-[#0f2d5e] text-sm font-medium hover:bg-[#f9fafb] transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProcessoTable;
