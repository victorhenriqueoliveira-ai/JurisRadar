// @vitest-environment jsdom
/**
 * Testes unitários do componente KanbanBoard.
 *
 * Cobre a regressão corrigida na Fase 3: o quadro Kanban precisa suportar
 * drag-and-drop real (mover cartão entre colunas e persistir via
 * PATCH /api/kanban/[id]), não só exibir cartões presos na coluna de criação.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import KanbanBoard from '../KanbanBoard';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const INITIAL_DATA = {
  a_fazer: [
    { id: 'card-1', titulo: 'Protocolar recurso', tag: 'Prazo', prazo: '3d', prioridade: 'alta', coluna: 'a_fazer' },
  ],
  em_andamento: [],
  aguardando: [],
  concluido: [],
};

function dragCard(cardEl: Element, dropZoneEl: Element) {
  const dataTransfer = {
    effectAllowed: '',
    setData: vi.fn(),
    getData: vi.fn(),
  };
  fireEvent.dragStart(cardEl, { dataTransfer });
  fireEvent.dragOver(dropZoneEl, { dataTransfer });
  fireEvent.drop(dropZoneEl, { dataTransfer });
}

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cartões têm o atributo draggable', () => {
    render(<KanbanBoard initialData={INITIAL_DATA} />);
    const card = screen.getByTestId('kanban-card-card-1');
    expect(card.getAttribute('draggable')).toBe('true');
  });

  it('ao arrastar um cartão para outra coluna, move visualmente e persiste via PATCH', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(<KanbanBoard initialData={INITIAL_DATA} />);

    const card = screen.getByTestId('kanban-card-card-1');
    const destinoColuna = screen.getByTestId('kanban-col-em_andamento');

    dragCard(card, destinoColuna);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/card-1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ coluna: 'em_andamento' }),
      }));
    });

    // O cartão deve ter saído da coluna "A fazer" e ido para "Em andamento"
    expect(screen.queryByTestId('kanban-card-card-1')).not.toBe(null);
    expect(screen.getByTestId('kanban-col-em_andamento').textContent).toContain('Protocolar recurso');
    expect(screen.getByTestId('kanban-col-a_fazer').textContent).not.toContain('Protocolar recurso');
  });

  it('reverte a posição do cartão se o PATCH falhar', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Erro' }) });
    render(<KanbanBoard initialData={INITIAL_DATA} />);

    const card = screen.getByTestId('kanban-card-card-1');
    const destinoColuna = screen.getByTestId('kanban-col-em_andamento');

    dragCard(card, destinoColuna);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Após o rollback, o cartão deve voltar para "A fazer"
    await waitFor(() => {
      expect(screen.getByTestId('kanban-col-a_fazer').textContent).toContain('Protocolar recurso');
      expect(screen.getByTestId('kanban-col-em_andamento').textContent).not.toContain('Protocolar recurso');
    });
  });
});
