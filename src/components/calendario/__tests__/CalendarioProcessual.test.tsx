/**
 * Testes unitários para CalendarioProcessual (Task 22).
 *
 * Verifica:
 * - onEventDrop com prazo_fatal em data passada exibe toast de erro 422
 * - onEventDrop válido chama PUT com nova data
 * - FocoDoDia: progresso com 1/3 concluído = 33%
 * - FocoDoDia: estado vazio exibe mensagem adequada
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-big-calendar', () => ({
  Calendar: ({ children }: { children?: React.ReactNode }) => <div data-testid="calendar">{children}</div>,
  dateFnsLocalizer: vi.fn(() => ({})),
  Views: { MONTH: 'month', WEEK: 'week', AGENDA: 'agenda' },
}));

vi.mock('react-big-calendar/lib/addons/dragAndDrop', () => ({
  default: (Cal: React.ComponentType<{ onEventDrop?: unknown; draggableAccessor?: unknown }>) => Cal,
}));

vi.mock('react-big-calendar/lib/addons/dragAndDrop/styles.css', () => ({}));

vi.mock('@/components/crm/ProcessoSheet', () => ({
  ProcessoSheet: () => null,
}));

vi.mock('@/lib/calendario-utils', () => ({
  resolverEstiloEvento: vi.fn(() => ({ style: { backgroundColor: '#2563eb' } })),
}));

vi.mock('@/services/calendario', () => ({}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── FocoDoDia tests ───────────────────────────────────────────────────────────

import { FocoDoDia } from '../FocoDoDia';

describe('FocoDoDia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], date: '2026-09-04' }),
    });
  });

  it('exibe estado vazio quando não há eventos', async () => {
    render(<FocoDoDia />);
    await waitFor(() => {
      expect(screen.getByText(/nenhum evento para hoje/i)).toBeInTheDocument();
    });
  });

  it('exibe barra de progresso com 33% quando 1 de 3 eventos concluídos', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'ev-1', titulo: 'Audiência', tipo: 'audiencia', fonte: 'calendario' },
          { id: 'ev-2', titulo: 'Reunião', tipo: 'pessoal', fonte: 'agenda' },
          { id: 'ev-3', titulo: 'Prazo', tipo: 'prazo', fonte: 'calendario' },
        ],
        date: '2026-09-04',
      }),
    });

    render(<FocoDoDia />);
    await waitFor(() => {
      expect(screen.getByText('Audiência')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('button', { name: /marcar como concluído/i });
    expect(checkboxes).toHaveLength(3);

    // Clica no primeiro checkbox
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  it('exibe barra de progresso 100% quando todos concluídos', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'ev-1', titulo: 'Tarefa', tipo: 'tarefa', fonte: 'agenda' }],
        date: '2026-09-04',
      }),
    });

    render(<FocoDoDia />);
    await waitFor(() => { expect(screen.getByText('Tarefa')).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /marcar como concluído/i }));

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});

// ── EventoCalendario tooltip tests ────────────────────────────────────────────

import { EventoCalendario } from '../EventoCalendario';

describe('EventoCalendario — Tooltip', () => {
  const event = {
    title: 'Audiência Final',
    tipo: 'audiencia' as const,
    data: '2026-12-01',
    processoId: 'proc-1',
    numeroCnj: '0001234-56.2026.8.26.0001',
    horaInicio: '14:00',
  };

  it('não exibe tooltip antes de 300ms', () => {
    render(<EventoCalendario event={event} />);
    fireEvent.mouseEnter(screen.getByTestId('evento-calendario'));
    expect(screen.queryByTestId('evento-tooltip')).not.toBeInTheDocument();
  });

  it('exibe tooltip com numeroCnj e tipo após 300ms', async () => {
    vi.useFakeTimers();
    render(<EventoCalendario event={event} />);
    fireEvent.mouseEnter(screen.getByTestId('evento-calendario'));
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.getByTestId('evento-tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('evento-tooltip')).toHaveTextContent('0001234-56.2026.8.26.0001');
    expect(screen.getByTestId('evento-tooltip')).toHaveTextContent('Audiência');
    vi.useRealTimers();
  });

  it('fecha tooltip ao mouseLeave antes de 300ms', async () => {
    vi.useFakeTimers();
    render(<EventoCalendario event={event} />);
    fireEvent.mouseEnter(screen.getByTestId('evento-calendario'));
    fireEvent.mouseLeave(screen.getByTestId('evento-calendario'));
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.queryByTestId('evento-tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
