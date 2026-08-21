'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface Nota {
  id: string;
  conteudo: string;
  createdAt: string | Date;
  userId?: string;
}

interface NotasListProps {
  notas: Nota[];
  onAddNota?: (conteudo: string) => Promise<void>;
  onDeleteNota?: (notaId: string) => Promise<void>;
  currentUserId?: string;
  canDelete?: (nota: Nota) => boolean;
}

export function NotasList({
  notas,
  onAddNota,
  onDeleteNota,
  currentUserId,
  canDelete,
}: NotasListProps) {
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !onAddNota) return;

    setSaving(true);
    setError('');
    try {
      await onAddNota(inputValue.trim());
      setInputValue('');
    } catch {
      setError('Erro ao salvar nota.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (notaId: string) => {
    if (!onDeleteNota) return;
    try {
      await onDeleteNota(notaId);
    } catch {
      // silently ignore
    }
  };

  const isOwnerOrAllowed = (nota: Nota) => {
    if (canDelete) return canDelete(nota);
    return nota.userId === currentUserId;
  };

  return (
    <div data-testid="notas-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {notas.length === 0 ? (
        <p style={{ color: 'var(--jr-primary)', opacity: 0.6, fontSize: '0.875rem' }}>
          Nenhuma nota adicionada.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notas.map((nota) => {
            const date = new Date(nota.createdAt);
            const label = isNaN(date.getTime())
              ? String(nota.createdAt)
              : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return (
              <li
                key={nota.id}
                data-testid="nota-item"
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--jr-primary)' }}>
                    {nota.conteudo}
                  </p>
                  <time
                    style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6 }}
                    dateTime={date.toISOString()}
                  >
                    {label}
                  </time>
                </div>
                {onDeleteNota && isOwnerOrAllowed(nota) && (
                  <button
                    type="button"
                    aria-label="Remover nota"
                    onClick={() => handleDelete(nota.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--jr-danger)',
                      fontSize: '0.75rem',
                      padding: '0.25rem',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {onAddNota && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea
            data-testid="nota-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Adicionar nota interna..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: 'var(--jr-primary)',
              fontSize: '0.875rem',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: 'var(--jr-danger)', fontSize: '0.75rem', margin: 0 }}>{error}</p>
          )}
          <Button
            type="submit"
            disabled={saving || !inputValue.trim()}
            size="sm"
          >
            {saving ? 'Salvando...' : 'Adicionar nota'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default NotasList;
