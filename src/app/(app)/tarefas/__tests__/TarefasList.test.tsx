// @vitest-environment jsdom
/**
 * Testes unitários do componente TarefasList.
 *
 * Cobre a regressão corrigida na Fase 3: marcar uma tarefa como concluída
 * precisa persistir via PATCH /api/tarefas/[id], não só atualizar estado local.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});
