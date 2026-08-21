import React from 'react';

export interface ImportLoaderProps {
  label?: string;
  className?: string;
}

/**
 * ImportLoader — loader animado para tela de importação de processos.
 * Cores via var(--jr-*) — sem valores hardcoded.
 */
export function ImportLoader({ label, className = '' }: ImportLoaderProps) {
  return (
    <div
      className={`import-loader ${className}`}
      role="status"
      aria-label={label ?? 'Carregando...'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
      }}
    >
      {/* Spinner */}
      <span
        aria-hidden="true"
        style={{
          display: 'block',
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '9999px',
          borderWidth: '3px',
          borderStyle: 'solid',
          borderColor: 'var(--jr-accent) transparent transparent transparent',
          animation: 'jr-spin 0.8s linear infinite',
        }}
      />

      {/* Label opcional */}
      {label && (
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--jr-primary)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default ImportLoader;
