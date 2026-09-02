// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import React from 'react';
import { AnexoUpload } from '../AnexoUpload';
import { AnexoList } from '../AnexoList';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAnexo(overrides?: Partial<{
  id: string;
  nome: string;
  url: string;
  tamanho: number;
  mime_type: string;
  created_at: string;
}>) {
  return {
    id: 'anexo-1',
    nome: 'contrato.pdf',
    url: 'https://blob.vercel.app/contrato.pdf',
    tamanho: 204800,
    mime_type: 'application/pdf',
    created_at: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

// ── AnexoUpload ───────────────────────────────────────────────────────────────

describe('AnexoUpload', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exibe área de drop com mensagem padrão', () => {
    render(<AnexoUpload processoId="proc-1" onUploadSuccess={vi.fn()} />);
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    expect(screen.getByText(/arraste um arquivo ou clique/i)).toBeInTheDocument();
  });

  it('exibe estado de drag ativo quando arquivo é arrastado sobre a área', () => {
    render(<AnexoUpload processoId="proc-1" onUploadSuccess={vi.fn()} />);
    const dropZone = screen.getByTestId('drop-zone');

    fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });

    expect(screen.getByText(/solte o arquivo aqui/i)).toBeInTheDocument();
    expect(dropZone).toHaveAttribute('data-drag-active', 'true');
  });

  it('remove estado de drag quando arquivo sai da área', () => {
    render(<AnexoUpload processoId="proc-1" onUploadSuccess={vi.fn()} />);
    const dropZone = screen.getByTestId('drop-zone');

    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);

    expect(dropZone).toHaveAttribute('data-drag-active', 'false');
  });

  it('com arquivo de tipo inválido exibe mensagem de erro sem fazer upload', async () => {
    const onUploadSuccess = vi.fn();
    render(<AnexoUpload processoId="proc-1" onUploadSuccess={onUploadSuccess} />);

    const arquivo = new File(['conteúdo'], 'video.mp4', { type: 'video/mp4' });
    const dropZone = screen.getByTestId('drop-zone');

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [arquivo] },
      });
    });

    expect(screen.getByTestId('upload-error')).toBeInTheDocument();
    expect(screen.getByTestId('upload-error').textContent).toMatch(/tipo não suportado/i);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('com PDF válido chama POST e invoca onUploadSuccess ao concluir', async () => {
    const onUploadSuccess = vi.fn();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'anexo-novo', nome: 'doc.pdf' }),
    } as Response);

    render(<AnexoUpload processoId="proc-1" onUploadSuccess={onUploadSuccess} />);

    const arquivo = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });
    const dropZone = screen.getByTestId('drop-zone');

    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer: { files: [arquivo] } });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/processos/proc-1/anexos',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('exibe erro 413 como "Arquivo muito grande"', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ error: 'Arquivo muito grande' }),
    } as Response);

    render(<AnexoUpload processoId="proc-1" onUploadSuccess={vi.fn()} />);

    const arquivo = new File(['pdf'], 'grande.pdf', { type: 'application/pdf' });
    const dropZone = screen.getByTestId('drop-zone');

    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer: { files: [arquivo] } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('upload-error').textContent).toMatch(/arquivo muito grande/i);
    });
  });

  it('exibe erro 415 como "Tipo não suportado"', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 415,
      json: async () => ({ error: 'Tipo não suportado' }),
    } as Response);

    render(<AnexoUpload processoId="proc-1" onUploadSuccess={vi.fn()} />);

    const arquivo = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });
    const dropZone = screen.getByTestId('drop-zone');

    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer: { files: [arquivo] } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('upload-error').textContent).toMatch(/tipo não suportado/i);
    });
  });
});

// ── AnexoList ─────────────────────────────────────────────────────────────────

describe('AnexoList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe mensagem de carregando enquanto busca', async () => {
    // Fetch nunca resolve para manter estado de carregando
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));

    render(<AnexoList processoId="proc-1" />);

    expect(screen.getByTestId('anexo-list-loading')).toBeInTheDocument();
  });

  it('exibe mensagem vazia quando não há anexos', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(<AnexoList processoId="proc-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('anexo-list-empty')).toBeInTheDocument();
    });
  });

  it('com 3 anexos exibe 3 linhas com nome, tamanho e data', async () => {
    const anexos = [
      makeAnexo({ id: 'a1', nome: 'contrato.pdf' }),
      makeAnexo({ id: 'a2', nome: 'foto.jpg', mime_type: 'image/jpeg' }),
      makeAnexo({ id: 'a3', nome: 'laudo.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    ];

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => anexos,
    } as Response);

    render(<AnexoList processoId="proc-1" />);

    await waitFor(() => {
      expect(screen.getAllByTestId('anexo-item')).toHaveLength(3);
    });

    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('foto.jpg')).toBeInTheDocument();
    expect(screen.getByText('laudo.docx')).toBeInTheDocument();

    // Tamanho formatado (200 KB para 204800 bytes)
    const metas = screen.getAllByTestId('anexo-meta');
    expect(metas[0].textContent).toMatch(/200\.0 KB/);
  });

  it('clique em "Excluir" abre dialog de confirmação', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [makeAnexo()],
    } as Response);

    render(<AnexoList processoId="proc-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('excluir-anexo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('excluir-anexo'));

    expect(screen.getByTestId('confirmacao-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('confirmar-exclusao')).toBeInTheDocument();
    expect(screen.getByTestId('cancelar-exclusao')).toBeInTheDocument();
  });

  it('clique em "Confirmar" no dialog chama DELETE e remove o item da lista', async () => {
    const anexo = makeAnexo();

    // Primeira chamada: GET lista; segunda: DELETE
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [anexo],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    render(<AnexoList processoId="proc-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('excluir-anexo')).toBeInTheDocument();
    });

    // Abre dialog
    fireEvent.click(screen.getByTestId('excluir-anexo'));

    // Confirma exclusão
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmar-exclusao'));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/processos/proc-1/anexos/${anexo.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );

    await waitFor(() => {
      expect(screen.queryByTestId('anexo-item')).not.toBeInTheDocument();
    });
  });

  it('clique em "Não" no dialog cancela exclusão', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [makeAnexo()],
    } as Response);

    render(<AnexoList processoId="proc-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('excluir-anexo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('excluir-anexo'));
    expect(screen.getByTestId('confirmacao-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancelar-exclusao'));
    expect(screen.queryByTestId('confirmacao-dialog')).not.toBeInTheDocument();

    // Item permanece na lista
    expect(screen.getByTestId('anexo-item')).toBeInTheDocument();
  });

  it('exibe link de download com href e atributo download corretos', async () => {
    const anexo = makeAnexo({ nome: 'contrato.pdf', url: 'https://blob.vercel.app/contrato.pdf' });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [anexo],
    } as Response);

    render(<AnexoList processoId="proc-1" />);

    await waitFor(() => {
      const link = screen.getByTestId('anexo-download');
      expect(link).toHaveAttribute('href', 'https://blob.vercel.app/contrato.pdf');
      expect(link).toHaveAttribute('download', 'contrato.pdf');
    });
  });
});
