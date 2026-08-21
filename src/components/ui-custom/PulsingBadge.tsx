import React from 'react';

export interface PulsingBadgeProps {
  count: number;
  className?: string;
}

/**
 * PulsingBadge — badge animado para notificações urgentes.
 * Não renderiza nada quando count === 0.
 * Cores via var(--jr-*) — sem valores hardcoded.
 */
export function PulsingBadge({ count, className = '' }: PulsingBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={`pulsing-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '1.375rem',
        height: '1.375rem',
        padding: '0 0.375rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        lineHeight: 1,
        background: 'var(--jr-danger)',
        color: 'var(--jr-danger-foreground)',
        animation: 'jr-pulse 1.5s ease-in-out infinite',
        boxShadow: '0 0 0 0 var(--jr-danger)',
      }}
      aria-label={`${count} notificações`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default PulsingBadge;
