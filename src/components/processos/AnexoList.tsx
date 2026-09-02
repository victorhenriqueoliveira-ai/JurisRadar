'use client';

import React, { useEffect, useState, useCallback } from 'react';

export interface Anexo {
  id: string;
  nome: string;
  url: string;
  tamanho: number;
  mime_type: string;
  created_at: string;
}

export interface AnexoListProps {
  processoId: string;
  refreshTrigger?: number;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarData(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR');
}

export function AnexoList({ processoId, refreshTrigger }: AnexoListProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const carregarAnexos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/processos/${processoId}/anexos`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErro(json.error ?? 'Erro ao carregar anexos.');
        return;
      }
      const json = await res.json();
      setAnexos(Array.isArray(json) ? json : (json.data ?? []));
    } catch {
      setErro('Erro de conexão ao carregar anexos.');
    } finally {
      setCarregando(false);
    }
  }, [processoId]);

  useEffect(() => {
    carregarAnexos();
  }, [carregarAnexos, refreshTrigger]);

  async function handleExcluir(anexoId: string) {
    setExcluindoId(anexoId);
    setErroExclusao(null);
    try {
      const res = await fetch(`/api/processos/${processoId}/anexos/${anexoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErroExclusao(json.error ?? 'Erro ao excluir anexo.');
        return;
      }
      setAnexos((prev) => prev.filter((a) => a.id !== anexoId));
    } catch {
      setErroExclusao('Erro de conexão ao excluir anexo.');
    } finally {
      setExcluindoId(null);
      setConfirmandoId(null);
    }
  }

  if (carregando) {
    return (
      <p
        data-testid="anexo-list-loading"
        style={{ fontSize: '0.8125rem', color: 'var(--jr-primary)', opacity: 0.5, margin: 0 }}
      >
        Carregando anexos...
      </p>
    );
  }

  if (erro) {
    return (
      <p
        data-testid="anexo-list-error"
        style={{ fontSize: '0.8125rem', color: 'var(--jr-danger, #dc2626)', margin: 0 }}
      >
        {erro}
      </p>
    );
  }

  if (anexos.length === 0) {
    return (
      <p
        data-testid="anexo-list-empty"
        style={{ fontSize: '0.8125rem', color: 'var(--jr-primary)', opacity: 0.5, margin: 0 }}
      >
        Nenhum anexo enviado ainda.
      </p>
    );
  }

  return (
    <div data-testid="anexo-list">
      {erroExclusao && (
        <p
          data-testid="exclusao-error"
          style={{ fontSize: '0.8125rem', color: 'var(--jr-danger, #dc2626)', marginBottom: '0.5rem' }}
        >
          {erroExclusao}
        </p>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {anexos.map((anexo) => (
          <li
            key={anexo.id}
            data-testid="anexo-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.625rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              background: '#fff',
            }}
          >
            {/* Informações do arquivo */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                data-testid="anexo-nome"
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--jr-primary)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {anexo.nome}
              </p>
              <p
                data-testid="anexo-meta"
                style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}
              >
                {formatarTamanho(anexo.tamanho)} · {formatarData(anexo.created_at)}
              </p>
            </div>

            {/* Botão de download */}
            <a
              href={anexo.url}
              download={anexo.nome}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="anexo-download"
              aria-label={`Baixar ${anexo.nome}`}
              style={{
                fontSize: '0.75rem',
                color: 'var(--jr-primary)',
                opacity: 0.7,
                textDecoration: 'none',
                padding: '0.25rem 0.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.25rem',
                flexShrink: 0,
              }}
            >
              Baixar
            </a>

            {/* Botão de exclusão ou dialog de confirmação */}
            {confirmandoId === anexo.id ? (
              <div
                data-testid="confirmacao-dialog"
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}
              >
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Excluir?</span>
                <button
                  type="button"
                  data-testid="confirmar-exclusao"
                  onClick={() => handleExcluir(anexo.id)}
                  disabled={excluindoId === anexo.id}
                  aria-label="Confirmar exclusão"
                  style={{
                    fontSize: '0.75rem',
                    color: '#fff',
                    background: 'var(--jr-danger, #dc2626)',
                    border: 'none',
                    borderRadius: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    cursor: excluindoId === anexo.id ? 'not-allowed' : 'pointer',
                    opacity: excluindoId === anexo.id ? 0.5 : 1,
                  }}
                >
                  {excluindoId === anexo.id ? 'Excluindo...' : 'Sim'}
                </button>
                <button
                  type="button"
                  data-testid="cancelar-exclusao"
                  onClick={() => setConfirmandoId(null)}
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    background: 'none',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="excluir-anexo"
                onClick={() => setConfirmandoId(anexo.id)}
                aria-label={`Excluir ${anexo.nome}`}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--jr-danger, #dc2626)',
                  background: 'none',
                  border: '1px solid #fca5a5',
                  borderRadius: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Excluir
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AnexoList;
