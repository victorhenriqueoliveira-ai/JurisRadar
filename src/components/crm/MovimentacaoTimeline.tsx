import React from 'react';

export interface Movimentacao {
  id: string;
  data: string | Date;
  descricao: string;
  tipo?: string;
}

interface MovimentacaoTimelineProps {
  movimentacoes: Movimentacao[];
}

export function MovimentacaoTimeline({ movimentacoes }: MovimentacaoTimelineProps) {
  if (!movimentacoes.length) {
    return (
      <p style={{ color: 'var(--jr-primary)', opacity: 0.6, fontSize: '0.875rem' }}>
        Nenhuma movimentação registrada.
      </p>
    );
  }

  return (
    <ol
      data-testid="movimentacao-timeline"
      style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {movimentacoes.map((mov, index) => {
        const date = new Date(mov.data);
        const label = isNaN(date.getTime())
          ? String(mov.data)
          : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        return (
          <li
            key={mov.id}
            data-testid="movimentacao-item"
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}
          >
            {/* Dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '0.25rem' }}>
              <div
                style={{
                  width: '0.625rem',
                  height: '0.625rem',
                  borderRadius: '9999px',
                  background: 'var(--jr-primary)',
                  flexShrink: 0,
                }}
              />
              {index < movimentacoes.length - 1 && (
                <div
                  style={{
                    width: '1px',
                    flex: 1,
                    minHeight: '1.5rem',
                    background: '#e5e7eb',
                    marginTop: '0.25rem',
                  }}
                />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <time
                dateTime={date.toISOString()}
                style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6 }}
              >
                {label}
              </time>
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.875rem', color: 'var(--jr-primary)' }}>
                {mov.descricao}
              </p>
              {mov.tipo && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '0.25rem',
                    fontSize: '0.7rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    color: 'var(--jr-primary)',
                  }}
                >
                  {mov.tipo}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default MovimentacaoTimeline;
