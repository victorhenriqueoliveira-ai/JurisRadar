// @vitest-environment jsdom
/**
 * Testes unitários do componente TarefasList.
 *
 * Cobre a regressão corrigida na Fase 3: marcar uma tarefa como concluída
 * precisa persistir via PATCH /api/tarefas/[id], não só atualizar estado local.
 *
 * Cobre também o achado da auditoria (Parte 4, Alto): o formulário de nova
 * tarefa não tinha campo para vincular a um processo, apesar do backend já
 * suportar `processoRef` — agora o modal oferece um campo com autocomplete
 * dos processos do escritório.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import TarefasList from '../TarefasList';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const TAREFAS = [
  { id: 't1', titulo: 'Protocolar petição', processoRef: null, prioridade: 'alta', prazo: '2026-11-01', status: 'pendente' },
  { id: 't2', titulo: 'Revisar contrato', processoRef: null, prioridade: 'media', prazo: null, status: 'concluida' },
];

describe('TarefasList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa checkbox marcado para tarefas com status concluida', () => {
    render(<TarefasList initialData={TAREFAS} />);
    const checkboxes = screen.getAllByRole('button', { name: /marcar|desmarcar/i });
    // t2 (concluída) deve ter aria-label "Desmarcar"
    expect(checkboxes[1].getAttribute('aria-label')).toBe('Desmarcar');
    expect(checkboxes[0].getAttribute('aria-label')).toBe('Marcar como concluída');
  });

  it('ao marcar uma tarefa pendente como concluída, chama PATCH com status concluida', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<TarefasList initialData={TAREFAS} />);

    const checkboxes = screen.getAllByRole('button', { name: /marcar|desmarcar/i });
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/tarefas/t1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'concluida' }),
      }));
    });
  });

  it('persiste a marcação visualmente após o PATCH ter sucesso', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<TarefasList initialData={TAREFAS} />);

    const checkboxes = screen.getAllByRole('button', { name: /marcar|desmarcar/i });
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /marcar|desmarcar/i })[0].getAttribute('aria-label')).toBe('Desmarcar');
    });
  });

  it('reverte a marcação visual se o PATCH falhar', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Erro' }) });
    render(<TarefasList initialData={TAREFAS} />);

    const checkboxes = screen.getAllByRole('button', { name: /marcar|desmarcar/i });
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /marcar|desmarcar/i })[0].getAttribute('aria-label')).toBe('Marcar como concluída');
    });
  });

  it('ao desmarcar uma tarefa concluída, chama PATCH com status pendente', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<TarefasList initialData={TAREFAS} />);

    const checkboxes = screen.getAllByRole('button', { name: /marcar|desmarcar/i });
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/tarefas/t2', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'pendente' }),
      }));
    });
  });

  describe('vínculo com processo no formulário de nova tarefa', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url.startsWith('/api/processos')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [{ id: 'p1', numeroCnj: '0001234-56.2026.8.26.0100' }] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ id: 'nova-tarefa', titulo: 'x', processoRef: null, prioridade: 'media', prazo: null, status: 'pendente' }) });
      });
    });

    it('busca os processos do escritório ao abrir o modal, para preencher o autocomplete', async () => {
      render(<TarefasList initialData={[]} />);
      fireEvent.click(screen.getByRole('button', { name: /nova tarefa/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/processos?limit=100');
      });

      expect(screen.getByPlaceholderText(/cnj do processo/i)).toBeInTheDocument();
    });

    it('envia processoRef preenchido ao criar a tarefa', async () => {
      render(<TarefasList initialData={[]} />);
      fireEvent.click(screen.getByRole('button', { name: /nova tarefa/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnj do processo/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/descreva a tarefa/i), { target: { value: 'Protocolar recurso' } });
      fireEvent.change(screen.getByPlaceholderText(/cnj do processo/i), { target: { value: '0001234-56.2026.8.26.0100' } });
      fireEvent.click(screen.getByRole('button', { name: /^criar$/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/tarefas', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            titulo: 'Protocolar recurso',
            prioridade: 'media',
            prazo: undefined,
            processoRef: '0001234-56.2026.8.26.0100',
            status: 'pendente',
          }),
        }));
      });
    });

    it('não envia processoRef quando o campo é deixado em branco', async () => {
      render(<TarefasList initialData={[]} />);
      fireEvent.click(screen.getByRole('button', { name: /nova tarefa/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cnj do processo/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/descreva a tarefa/i), { target: { value: 'Tarefa sem processo' } });
      fireEvent.click(screen.getByRole('button', { name: /^criar$/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/tarefas', expect.objectContaining({
          body: JSON.stringify({
            titulo: 'Tarefa sem processo',
            prioridade: 'media',
            prazo: undefined,
            processoRef: undefined,
            status: 'pendente',
          }),
        }));
      });
    });
  });
});
