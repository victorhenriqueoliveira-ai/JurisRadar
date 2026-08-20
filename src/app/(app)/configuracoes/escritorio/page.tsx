'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MembrosTable, type Membro } from '@/components/configuracoes/MembrosTable';
import { ConviteDialog } from '@/components/configuracoes/ConviteDialog';

interface EscritorioData {
  id: string;
  nome: string;
  cnpj: string | null;
  areaAtuacao: string | null;
  plano: string | null;
}

interface SessionUser {
  id: string;
  role: string;
}

export default function EscritorioPage() {
  const [escritorio, setEscritorioData] = useState<EscritorioData | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [areaAtuacao, setAreaAtuacao] = useState('');

  const isSocio = currentUser?.role === 'socio';

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, membrosRes, sessionRes] = await Promise.all([
        fetch('/api/organizacoes/me'),
        fetch('/api/organizacoes/me/membros'),
        fetch('/api/auth/session'),
      ]);

      if (!meRes.ok) throw new Error('Falha ao carregar dados do escritório.');
      if (!membrosRes.ok) throw new Error('Falha ao carregar membros.');

      const meData = await meRes.json() as EscritorioData;
      const membrosData = await membrosRes.json() as Membro[];

      setEscritorioData(meData);
      setNome(meData.nome ?? '');
      setCnpj(meData.cnpj ?? '');
      setAreaAtuacao(meData.areaAtuacao ?? '');
      setMembros(membrosData);

      if (sessionRes.ok) {
        const session = await sessionRes.json() as { user?: { id?: string; role?: string } };
        if (session?.user?.id) {
          setCurrentUser({ id: session.user.id, role: session.user.role ?? 'associado' });
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Save escritorio ────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);
    try {
      const res = await fetch('/api/organizacoes/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, cnpj, areaAtuacao }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `Erro ${res.status}`);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Convidar ───────────────────────────────────────────────────────────────

  async function handleConvidar(email: string, papel: string) {
    const res = await fetch('/api/organizacoes/me/membros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, papel }),
    });
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      throw new Error(body.error ?? `Erro ${res.status}`);
    }
    await fetchData();
  }

  // ── Change papel ───────────────────────────────────────────────────────────

  async function handleChangePapel(id: string, papel: string) {
    const res = await fetch(`/api/organizacoes/me/membros/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ papel }),
    });
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      throw new Error(body.error ?? `Erro ${res.status}`);
    }
    await fetchData();
  }

  // ── Remover ────────────────────────────────────────────────────────────────

  async function handleRemover(id: string) {
    const ok = window.confirm('Tem certeza que deseja remover este membro?');
    if (!ok) return;

    const res = await fetch(`/api/organizacoes/me/membros/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      throw new Error(body.error ?? `Erro ${res.status}`);
    }
    await fetchData();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main style={{ padding: '1.5rem' }}>
        <div
          style={{
            height: '2rem',
            borderRadius: '0.375rem',
            background: 'var(--jr-glass-bg)',
            border: '1px solid var(--jr-glass-border)',
            marginBottom: '1rem',
            animation: 'jr-pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            height: '8rem',
            borderRadius: '0.375rem',
            background: 'var(--jr-glass-bg)',
            border: '1px solid var(--jr-glass-border)',
            animation: 'jr-pulse 1.5s ease-in-out infinite',
          }}
        />
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: '1.5rem' }}>
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: 'var(--jr-danger)',
            color: 'var(--jr-danger-foreground)',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--jr-primary)' }}>
        Configurações do Escritório
      </h1>

      {/* ── Dados do escritório ─────────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--jr-glass-bg)',
          border: '1px solid var(--jr-glass-border)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <h2
          style={{
            margin: '0 0 1.25rem',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--jr-primary)',
          }}
        >
          Dados do escritório
        </h2>

        <form onSubmit={handleSave} noValidate>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label
                htmlFor="escritorio-nome"
                style={{
                  display: 'block',
                  marginBottom: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--jr-primary)',
                }}
              >
                Nome
              </label>
              <input
                id="escritorio-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={saving || !isSocio}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--jr-glass-border)',
                  background: 'var(--jr-glass-bg)',
                  color: 'var(--jr-primary)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="escritorio-cnpj"
                style={{
                  display: 'block',
                  marginBottom: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--jr-primary)',
                }}
              >
                CNPJ
              </label>
              <input
                id="escritorio-cnpj"
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                disabled={saving || !isSocio}
                placeholder="00.000.000/0001-00"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--jr-glass-border)',
                  background: 'var(--jr-glass-bg)',
                  color: 'var(--jr-primary)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="escritorio-area"
                style={{
                  display: 'block',
                  marginBottom: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--jr-primary)',
                }}
              >
                Área de Atuação
              </label>
              <input
                id="escritorio-area"
                type="text"
                value={areaAtuacao}
                onChange={(e) => setAreaAtuacao(e.target.value)}
                disabled={saving || !isSocio}
                placeholder="Ex: Trabalhista, Cível"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--jr-glass-border)',
                  background: 'var(--jr-glass-bg)',
                  color: 'var(--jr-primary)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {saveError && (
            <p
              role="alert"
              style={{
                color: 'var(--jr-danger, #ef4444)',
                fontSize: '0.8rem',
                marginBottom: '0.5rem',
              }}
            >
              {saveError}
            </p>
          )}

          {saveSuccess && (
            <p
              style={{
                color: 'var(--jr-success, #22c55e)',
                fontSize: '0.8rem',
                marginBottom: '0.5rem',
              }}
            >
              Dados salvos com sucesso.
            </p>
          )}

          {isSocio && (
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: 'var(--jr-accent, #3b82f6)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </form>
      </section>

      {/* ── Membros ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--jr-glass-bg)',
          border: '1px solid var(--jr-glass-border)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--jr-primary)',
            }}
          >
            Membros ({membros.length})
          </h2>

          {isSocio && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: 'var(--jr-accent, #3b82f6)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Convidar
            </button>
          )}
        </div>

        <MembrosTable
          membros={membros}
          currentUserId={currentUser?.id ?? ''}
          onChangePapel={handleChangePapel}
          onRemover={handleRemover}
        />
      </section>

      {/* ── Dialog ─────────────────────────────────────────────────────────── */}
      <ConviteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConvidar={handleConvidar}
      />
    </main>
  );
}
