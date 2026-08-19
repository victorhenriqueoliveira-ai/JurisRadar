import React from 'react';

export interface EmptyStateIllustratedProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * EmptyStateIllustrated — estado vazio com SVG animado (pasta/documentos).
 * Cores via var(--jr-*) — sem valores hardcoded.
 */
export function EmptyStateIllustrated({
  title,
  description,
  className = '',
}: EmptyStateIllustratedProps) {
  return (
    <div
      className={`empty-state-illustrated ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      {/* SVG inline — pasta vazia animada */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        style={{ animation: 'jr-float 3s ease-in-out infinite' }}
      >
        {/* Pasta base */}
        <rect
          x="10"
          y="40"
          width="100"
          height="65"
          rx="6"
          fill="var(--jr-glass-bg)"
          stroke="var(--jr-glass-border)"
          strokeWidth="2"
        />
        {/* Aba da pasta */}
        <path
          d="M10 40 L10 30 Q10 24 16 24 L44 24 Q48 24 50 28 L54 34 L110 34 Q116 34 116 40"
          fill="var(--jr-primary)"
          opacity="0.6"
        />
        {/* Linha decorativa 1 */}
        <line
          x1="30"
          y1="65"
          x2="90"
          y2="65"
          stroke="var(--jr-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Linha decorativa 2 */}
        <line
          x1="30"
          y1="78"
          x2="75"
          y2="78"
          stroke="var(--jr-glass-border)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Linha decorativa 3 */}
        <line
          x1="30"
          y1="91"
          x2="60"
          y2="91"
          stroke="var(--jr-glass-border)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Ícone de lupa / busca vazia */}
        <circle
          cx="90"
          cy="85"
          r="14"
          fill="none"
          stroke="var(--jr-accent)"
          strokeWidth="2"
          opacity="0.8"
        />
        <line
          x1="100"
          y1="95"
          x2="108"
          y2="103"
          stroke="var(--jr-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>

      {/* Título */}
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--jr-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>

      {/* Descrição opcional */}
      {description && (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--jr-primary)',
            opacity: 0.7,
            margin: 0,
            maxWidth: '28rem',
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export default EmptyStateIllustrated;
