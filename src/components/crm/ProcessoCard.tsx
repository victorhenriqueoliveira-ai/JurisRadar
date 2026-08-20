import React from 'react';
import { PulsingBadge } from '@/components/ui-custom/PulsingBadge';
import type { ProcessoRow } from './ProcessoTable';

interface ProcessoCardProps {
  processo: ProcessoRow;
  onClick?: (processo: ProcessoRow) => void;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-BR');
}

function isUrgent(processo: ProcessoRow): boolean {
  if (!processo.proximoPrazo) return false;
  const prazo = new Date(processo.proximoPrazo);
  if (isNaN(prazo.getTime())) return false;
  const diffDays = (prazo.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays <= 5;
}

const STATUS_COLORS: Record<string, string> = {
  ativo: '#16a34a',
  suspenso: '#ca8a04',
  encerrado: '#6b7280',
  arquivado: '#9ca3af',
};

export function ProcessoCard({ processo, onClick }: ProcessoCardProps) {
  const urgent = isUrgent(processo);
  const statusColor = STATUS_COLORS[processo.status ?? ''] ?? '#6b7280';

  return (
    <article
      data-testid="processo-card"
      onClick={() => onClick?.(processo)}
      style={{
        padding: '1rem',
        borderRadius: '0.625rem',
        background: 'var(--jr-glass-bg)',
        border: '1px solid var(--jr-glass-border)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--jr-primary)', wordBreak: 'break-all' }}>
            {processo.numeroCnj}
          </p>
          {processo.tribunal && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.7 }}>
              {processo.tribunal}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexShrink: 0 }}>
          {urgent && <PulsingBadge count={1} />}
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
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--jr-primary)' }}>
        {processo.areaDireito && (
          <span style={{ opacity: 0.8 }}>
            Área: <strong>{processo.areaDireito}</strong>
          </span>
        )}
        {processo.proximoPrazo && (
          <span style={{ color: urgent ? 'var(--jr-danger)' : 'inherit', opacity: 0.9 }}>
            Prazo: <strong>{formatDate(processo.proximoPrazo)}</strong>
          </span>
        )}
        {processo.ultimaMovimentacao && (
          <span style={{ opacity: 0.7, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Últ. mov.: {processo.ultimaMovimentacao}
          </span>
        )}
      </div>
    </article>
  );
}

export default ProcessoCard;
