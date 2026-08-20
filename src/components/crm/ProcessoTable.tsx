'use client';

import React from 'react';
import { EmptyStateIllustrated } from '@/components/ui-custom/EmptyStateIllustrated';
import { PulsingBadge } from '@/components/ui-custom/PulsingBadge';
import { Button } from '@/components/ui/button';

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
    <div
      data-testid="processo-table-wrapper"
      // Hidden on mobile (<768px) — ProcessoCard is shown instead
      className="hidden md:block"
    >
      {/* Last sync indicator */}
      {lastSync && (
        <p
          data-testid="last-sync"
          style={{
            fontSize: '0.75rem',
            color: 'var(--jr-primary)',
            opacity: 0.6,
            margin: '0 0 0.5rem',
            textAlign: 'right',
          }}
        >
          Última sync {lastSync.toLocaleDateString('pt-BR')} às{' '}
          {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {data.length === 0 ? (
        <EmptyStateIllustrated
          title="Nenhum processo encontrado"
          description="Tente ajustar os filtros ou adicione processos ao CRM."
        />
      ) : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--jr-glass-border)' }}>
            <table
              data-testid="processo-table"
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}
            >
              <thead>
                <tr style={{ background: 'var(--jr-glass-bg)', borderBottom: '1px solid var(--jr-glass-border)' }}>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.field}
                      onClick={() => handleSort(col.field)}
                      style={{
                        padding: '0.625rem 0.75rem',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: 'var(--jr-primary)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        fontSize: '0.8125rem',
                      }}
                      aria-sort={
                        sort.field === col.field
                          ? sort.direction === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                      }
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {col.label} {sortIcon(col.field)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((processo, i) => {
                  const urgent = isUrgent(processo);
                  const statusColor = STATUS_COLORS[processo.status ?? ''] ?? '#6b7280';

                  return (
                    <tr
                      key={processo.id}
                      data-testid="processo-row"
                      onClick={() => onRowClick?.(processo)}
                      style={{
                        background: i % 2 === 0 ? 'transparent' : 'var(--jr-glass-bg)',
                        cursor: onRowClick ? 'pointer' : 'default',
                        borderBottom: '1px solid var(--jr-glass-border)',
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Número CNJ */}
                      <td style={{ padding: '0.625rem 0.75rem', whiteSpace: 'nowrap', color: 'var(--jr-primary)', fontWeight: 500 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          {processo.numeroCnj}
                          {urgent && <PulsingBadge count={1} />}
                        </span>
                      </td>

                      {/* Tribunal */}
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--jr-primary)', opacity: 0.8 }}>
                        {processo.tribunal ?? '—'}
                      </td>

                      {/* Área */}
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--jr-primary)', opacity: 0.8 }}>
                        {processo.areaDireito ?? '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: `${statusColor}22`,
                            color: statusColor,
                            border: `1px solid ${statusColor}44`,
                          }}
                        >
                          {processo.status ?? '—'}
                        </span>
                      </td>

                      {/* Última movimentação */}
                      <td
                        style={{
                          padding: '0.625rem 0.75rem',
                          color: 'var(--jr-primary)',
                          opacity: 0.8,
                          maxWidth: '12rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={processo.ultimaMovimentacao ?? ''}
                      >
                        {processo.ultimaMovimentacao ?? '—'}
                      </td>

                      {/* Próximo prazo */}
                      <td
                        style={{
                          padding: '0.625rem 0.75rem',
                          color: urgent ? 'var(--jr-danger)' : 'var(--jr-primary)',
                          fontWeight: urgent ? 600 : 400,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(processo.proximoPrazo)}
                      </td>

                      {/* Responsável */}
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--jr-primary)', opacity: 0.8 }}>
                        {processo.responsavelNome ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={loadingMore}
                data-testid="load-more"
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProcessoTable;
