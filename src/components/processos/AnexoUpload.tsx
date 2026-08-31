'use client';

import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';

export interface AnexoUploadProps {
  processoId: string;
  onUploadSuccess: () => void;
}

const TIPOS_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const EXTENSOES_ACEITAS = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnexoUpload({ processoId, onUploadSuccess }: AnexoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validarArquivo(arquivo: File): string | null {
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      return 'Tipo não suportado. Use PDF, imagem (JPG/PNG) ou documento Word (DOC/DOCX).';
    }
    if (arquivo.size > 10 * 1024 * 1024) {
      return 'Arquivo muito grande. Tamanho máximo: 10 MB.';
    }
    return null;
  }

  async function realizarUpload(arquivo: File) {
    const erroValidacao = validarArquivo(arquivo);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setErro(null);
    setUploading(true);
    setProgresso(10);

    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);

      // Simula progresso enquanto aguarda resposta
      const intervalo = setInterval(() => {
        setProgresso((prev) => Math.min(prev + 15, 85));
      }, 300);

      const res = await fetch(`/api/processos/${processoId}/anexos`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(intervalo);
      setProgresso(100);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const status = res.status;
        if (status === 413) {
          setErro('Arquivo muito grande. Tamanho máximo: 10 MB.');
        } else if (status === 415) {
          setErro('Tipo não suportado. Use PDF, imagem (JPG/PNG) ou documento Word (DOC/DOCX).');
        } else {
          setErro(json.error ?? 'Erro ao fazer upload do arquivo.');
        }
        setProgresso(0);
        return;
      }

      onUploadSuccess();
      setProgresso(0);
    } catch {
      setErro('Erro de conexão ao fazer upload.');
      setProgresso(0);
    } finally {
      setUploading(false);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const arquivo = e.dataTransfer.files?.[0];
    if (arquivo) {
      realizarUpload(arquivo);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) {
      realizarUpload(arquivo);
    }
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <div data-testid="anexo-upload">
      <div
        data-testid="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        aria-label={isDragOver ? 'Solte o arquivo aqui' : 'Arraste ou clique para fazer upload'}
        data-drag-active={isDragOver ? 'true' : 'false'}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--jr-primary)' : '#d1d5db'}`,
          borderRadius: '0.5rem',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: isDragOver ? 'color-mix(in srgb, var(--jr-primary) 8%, transparent)' : '#fafafa',
          transition: 'border-color 0.2s, background 0.2s',
          userSelect: 'none',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--jr-primary)', opacity: 0.8 }}>
          {isDragOver
            ? 'Solte o arquivo aqui'
            : uploading
              ? 'Enviando...'
              : 'Arraste um arquivo ou clique para selecionar'}
        </p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
          PDF, JPG, PNG, DOC, DOCX — máx. 10 MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={EXTENSOES_ACEITAS}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-testid="file-input"
      />

      {uploading && progresso > 0 && (
        <div
          data-testid="progress-bar-container"
          style={{
            marginTop: '0.5rem',
            height: '4px',
            background: '#e5e7eb',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="progress-bar"
            style={{
              height: '100%',
              width: `${progresso}%`,
              background: 'var(--jr-primary)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {erro && (
        <p
          data-testid="upload-error"
          style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: 'var(--jr-danger, #dc2626)' }}
        >
          {erro}
        </p>
      )}
    </div>
  );
}

export default AnexoUpload;
