'use client';

import React, { useState } from 'react';

export interface Membro {
  id: string;
  userId: string;
  nome: string | null;
  email: string;
  papel: 'socio' | 'associado' | 'estagiario';
  entradaEm: string | null;
}

interface MembrosTableProps {
  membros: Membro[];
  currentUserId: string;
  onChangePapel: (id: string, papel: string) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
}

const PAPEIS = [
  { value: 'socio', label: 'Sócio' },
  { value: 'associado', label: 'Associado' },
  { value: 'estagiario', label: 'Estagiário' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

export function MembrosTable({ membros, currentUserId, onChangePapel, onRemover }: MembrosTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleChangePapel(id: string, papel: string) {
    setLoadingId(id);
    try {
      await onChangePapel(id, papel);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRemover(id: string) {
    setLoadingId(id);
    try {
      await onRemover(id);
    } finally {
      setLoadingId(null);
    }
  }

  if (membros.length === 0) {
    return (
      <p style={{ color: 'var(--jr-primary)', opacity: 0.6, textAlign: 'center', padding: '2rem 0' }}>
        Nenhum membro encontrado.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--jr-glass-border)',
              color: 'var(--jr-primary)',
              opacity: 0.7,
            }}
          >
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Nome</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>E-mail</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Papel</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Entrada</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {membros.map((m) => {
            const isSelf = m.userId === currentUserId;
            const isLoading = loadingId === m.id;

            return (
              <tr
                key={m.id}
                style={{
                  borderBottom: '1px solid var(--jr-glass-border)',
                  opacity: isLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <td style={{ padding: '0.75rem', color: 'var(--jr-primary)' }}>
                  {m.nome ?? '—'}
                  {isSelf && (
                    <span
                      style={{
                        marginLeft: '0.4rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--jr-accent)',
                        background: 'var(--jr-glass-bg)',
                        borderRadius: '999px',
                        padding: '0.1rem 0.4rem',
                        border: '1px solid var(--jr-glass-border)',
                      }}
                    >
                      você
                    </span>
                  )}
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--jr-primary)', opacity: 0.8 }}>{m.email}</td>
                <td style={{ padding: '0.75rem' }}>
                  <select
                    value={m.papel}
                    disabled={isLoading || isSelf}
                    onChange={(e) => handleChangePapel(m.id, e.target.value)}
                    aria-label={`Papel de ${m.nome ?? m.email}`}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--jr-glass-border)',
                      background: 'var(--jr-glass-bg)',
                      color: 'var(--jr-primary)',
                      fontSize: '0.8rem',
                      cursor: isSelf ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {PAPEIS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--jr-primary)', opacity: 0.7 }}>
                  {formatDate(m.entradaEm)}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => handleRemover(m.id)}
                    disabled={isLoading || isSelf}
                    aria-label={`Remover ${m.nome ?? m.email}`}
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--jr-danger, #ef4444)',
                      background: 'transparent',
                      color: 'var(--jr-danger, #ef4444)',
                      fontSize: '0.8rem',
                      cursor: isLoading || isSelf ? 'not-allowed' : 'pointer',
                      opacity: isSelf ? 0.4 : 1,
                      transition: 'background 0.15s',
                    }}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
