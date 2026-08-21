'use client';

import React, { useState } from 'react';

interface ConviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvidar: (email: string, papel: string) => Promise<void>;
}

export function ConviteDialog({ open, onOpenChange, onConvidar }: ConviteDialogProps) {
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<'associado' | 'estagiario'>('associado');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setError('Informe um e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      await onConvidar(emailTrimmed, papel);
      setEmail('');
      setPapel('associado');
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || 'Erro ao enviar convite.');
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Convidar membro"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: 'var(--background, #fff)',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--jr-primary)',
          }}
        >
          Convidar membro
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="convite-email"
              style={{
                display: 'block',
                marginBottom: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--jr-primary)',
              }}
            >
              E-mail
            </label>
            <input
              id="convite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="advogado@escritorio.com"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: 'var(--jr-primary)',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="convite-papel"
              style={{
                display: 'block',
                marginBottom: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--jr-primary)',
              }}
            >
              Papel
            </label>
            <select
              id="convite-papel"
              value={papel}
              onChange={(e) => setPapel(e.target.value as 'associado' | 'estagiario')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: 'var(--jr-primary)',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            >
              <option value="associado">Associado</option>
              <option value="estagiario">Estagiário</option>
            </select>
          </div>

          {error && (
            <p
              role="alert"
              style={{
                color: 'var(--jr-danger, #ef4444)',
                fontSize: '0.8rem',
                marginBottom: '0.75rem',
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb',
                background: 'transparent',
                color: 'var(--jr-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: 'var(--jr-accent, #3b82f6)',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Convidando...' : 'Convidar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
