// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock ui-custom components (no CSS vars in jsdom)
vi.mock('@/components/ui-custom/PulsingBadge', () => ({
  PulsingBadge: ({ count }: { count: number }) =>
    count > 0 ? <span data-testid="pulsing-badge">{count}</span> : null,
}));

vi.mock('@/components/ui-custom/EmptyStateIllustrated', () => ({
  EmptyStateIllustrated: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

// Mock Sheet (base-ui not available in jsdom)
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

import React from 'react';
import { ProcessoTable, type ProcessoRow, type SortState } from '../ProcessoTable';
import { ProcessoFilters, type FilterValues } from '../ProcessoFilters';
import { ProcessoSheet } from '../ProcessoSheet';
import { ProcessoCard } from '../ProcessoCard';
import { MovimentacaoTimeline, type Movimentacao } from '../MovimentacaoTimeline';
import { NotasList, type Nota } from '../NotasList';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProcesso(overrides?: Partial<ProcessoRow>): ProcessoRow {
  return {
    id: 'proc-1',
    numeroCnj: '0001234-56.2024.8.26.0100',
    tribunal: 'TJSP',
    areaDireito: 'civil',
    status: 'ativo',
    ultimaMovimentacao: 'Despacho',
    proximoPrazo: null,
    responsavelNome: 'Dr. Silva',
    ...overrides,
  };
}

function makeProcessos(n: number): ProcessoRow[] {
  return Array.from({ length: n }, (_, i) =>
    makeProcesso({ id: `proc-${i + 1}`, numeroCnj: `000${i + 1}-00.2024.8.26.0100` }),
  );
}

const defaultSort: SortState = { field: 'proximoPrazo', direction: 'asc' };

// ── ProcessoTable ─────────────────────────────────────────────────────────────

describe('ProcessoTable', () => {
  it('renderiza EmptyStateIllustrated quando lista está vazia', () => {
    render(
      <ProcessoTable
        processos={[]}
        sort={defaultSort}
        onSortChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renderiza 5 linhas quando há 5 processos', () => {
    render(
      <ProcessoTable
        processos={makeProcessos(5)}
        sort={defaultSort}
        onSortChange={vi.fn()}
      />,
    );
    const rows = screen.getAllByTestId('processo-row');
    expect(rows).toHaveLength(5);
  });

  it('clica no cabeçalho "Próximo prazo" e muda direção para asc', () => {
    const onSortChange = vi.fn();
    const { rerender } = render(
      <ProcessoTable
        processos={makeProcessos(2)}
        sort={{ field: 'ultimaMovimentacao', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );

    // Click on "Próximo prazo" header
    fireEvent.click(screen.getByText(/próximo prazo/i));
    expect(onSortChange).toHaveBeenCalledWith({ field: 'proximoPrazo', direction: 'asc' });

    // Simulate sort state update and click again → desc
    rerender(
      <ProcessoTable
        processos={makeProcessos(2)}
        sort={{ field: 'proximoPrazo', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    fireEvent.click(screen.getByText(/próximo prazo/i));
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'proximoPrazo', direction: 'desc' });
  });

  it('sort icon shows "↑" for asc and "↓" for desc on active column', () => {
    const { rerender } = render(
      <ProcessoTable
        processos={makeProcessos(1)}
        sort={{ field: 'tribunal', direction: 'asc' }}
        onSortChange={vi.fn()}
      />,
    );
    const ascIcon = screen.getByText('↑');
    expect(ascIcon).toBeInTheDocument();

    rerender(
      <ProcessoTable
        processos={makeProcessos(1)}
        sort={{ field: 'tribunal', direction: 'desc' }}
        onSortChange={vi.fn()}
      />,
    );
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('exibe PulsingBadge vermelho quando prazo ≤ 5 dias', () => {
    const urgentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <ProcessoTable
        processos={[makeProcesso({ proximoPrazo: urgentDate })]}
        sort={defaultSort}
        onSortChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('pulsing-badge')).toBeInTheDocument();
  });

  it('não exibe PulsingBadge quando prazo > 5 dias', () => {
    const safeDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <ProcessoTable
        processos={[makeProcesso({ proximoPrazo: safeDate })]}
        sort={defaultSort}
        onSortChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('pulsing-badge')).not.toBeInTheDocument();
  });

  it('chama onRowClick ao clicar em uma linha', () => {
    const onRowClick = vi.fn();
    render(
      <ProcessoTable
        processos={makeProcessos(1)}
        sort={defaultSort}
        onSortChange={vi.fn()}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByTestId('processo-row'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('renderiza botão "Carregar mais" quando hasMore=true', () => {
    render(
      <ProcessoTable
        processos={makeProcessos(2)}
        sort={defaultSort}
        onSortChange={vi.fn()}
        hasMore
        onLoadMore={vi.fn()}
      />,
    );
    expect(screen.getByTestId('load-more')).toBeInTheDocument();
  });

  it('exibe indicador de última sync', () => {
    const date = new Date('2024-03-15T14:30:00');
    render(
      <ProcessoTable
        processos={makeProcessos(1)}
        sort={defaultSort}
        onSortChange={vi.fn()}
        lastSync={date}
      />,
    );
    expect(screen.getByTestId('last-sync')).toBeInTheDocument();
  });
});

// ── ProcessoFilters ───────────────────────────────────────────────────────────

describe('ProcessoFilters', () => {
  it('renderiza sem erros', () => {
    render(<ProcessoFilters filters={{}} onFilterChange={vi.fn()} />);
    expect(screen.getByTestId('processo-filters')).toBeInTheDocument();
  });

  it('com status="ativo" selecionado chama onFilterChange com { status: "ativo" }', () => {
    const onFilterChange = vi.fn();
    render(<ProcessoFilters filters={{}} onFilterChange={onFilterChange} />);

    fireEvent.change(screen.getByTestId('filter-status'), { target: { value: 'ativo' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'ativo' }));
  });

  it('busca textual com debounce: não chama onFilterChange imediatamente', async () => {
    vi.useFakeTimers();
    const onFilterChange = vi.fn();
    render(<ProcessoFilters filters={{}} onFilterChange={onFilterChange} />);

    fireEvent.change(screen.getByTestId('filter-search'), { target: { value: 'teste' } });

    // Should not have been called yet
    expect(onFilterChange).not.toHaveBeenCalled();

    // After debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ q: 'teste' }));

    vi.useRealTimers();
  });

  it('toggle urgência muda o estado do botão', () => {
    const onFilterChange = vi.fn();
    render(<ProcessoFilters filters={{ urgencia: false }} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByTestId('filter-urgencia'));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ urgencia: true }));
  });
});

// ── ProcessoSheet ─────────────────────────────────────────────────────────────

describe('ProcessoSheet', () => {
  const movimentacoes: Movimentacao[] = [
    { id: 'm1', data: '2024-01-10', descricao: 'Petição inicial' },
    { id: 'm2', data: '2024-02-01', descricao: 'Despacho' },
    { id: 'm3', data: '2024-03-15', descricao: 'Audiência marcada' },
  ];

  it('não renderiza nada quando open=false', () => {
    render(
      <ProcessoSheet
        processo={makeProcesso()}
        open={false}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('renderiza processo quando open=true', () => {
    render(
      <ProcessoSheet
        processo={{ ...makeProcesso(), movimentacoes: [], notas: [], honorario: null }}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
    // SheetTitle mock renders as h2 — check content via text
    expect(screen.getByText('0001234-56.2024.8.26.0100')).toBeInTheDocument();
  });

  it('exibe 3 movimentações na timeline', () => {
    render(
      <ProcessoSheet
        processo={{ ...makeProcesso(), movimentacoes, notas: [], honorario: null }}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );
    const items = screen.getAllByTestId('movimentacao-item');
    expect(items).toHaveLength(3);
  });
});

// ── ProcessoCard ──────────────────────────────────────────────────────────────

describe('ProcessoCard', () => {
  it('renderiza número CNJ e status', () => {
    render(<ProcessoCard processo={makeProcesso()} />);
    expect(screen.getByTestId('processo-card')).toBeInTheDocument();
    expect(screen.getByText('0001234-56.2024.8.26.0100')).toBeInTheDocument();
    expect(screen.getByText('ativo')).toBeInTheDocument();
  });

  it('exibe PulsingBadge quando prazo ≤ 5 dias', () => {
    const urgentDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    render(<ProcessoCard processo={makeProcesso({ proximoPrazo: urgentDate })} />);
    expect(screen.getByTestId('pulsing-badge')).toBeInTheDocument();
  });

  it('não exibe PulsingBadge quando prazo > 5 dias', () => {
    const safeDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    render(<ProcessoCard processo={makeProcesso({ proximoPrazo: safeDate })} />);
    expect(screen.queryByTestId('pulsing-badge')).not.toBeInTheDocument();
  });

  it('chama onClick ao clicar', () => {
    const onClick = vi.fn();
    render(<ProcessoCard processo={makeProcesso()} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('processo-card'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ── MovimentacaoTimeline ─────────────────────────────────────────────────────

describe('MovimentacaoTimeline', () => {
  it('renderiza mensagem quando lista está vazia', () => {
    render(<MovimentacaoTimeline movimentacoes={[]} />);
    expect(screen.getByText(/nenhuma movimentação/i)).toBeInTheDocument();
  });

  it('renderiza n itens corretamente', () => {
    const movs: Movimentacao[] = [
      { id: '1', data: '2024-01-01', descricao: 'Despacho' },
      { id: '2', data: '2024-01-15', descricao: 'Audiência' },
    ];
    render(<MovimentacaoTimeline movimentacoes={movs} />);
    expect(screen.getAllByTestId('movimentacao-item')).toHaveLength(2);
  });
});

// ── NotasList ─────────────────────────────────────────────────────────────────

describe('NotasList', () => {
  it('renderiza mensagem quando não há notas', () => {
    render(<NotasList notas={[]} />);
    expect(screen.getByText(/nenhuma nota/i)).toBeInTheDocument();
  });

  it('renderiza itens de notas', () => {
    const notas: Nota[] = [
      { id: 'n1', conteudo: 'Nota 1', createdAt: '2024-01-01', userId: 'u1' },
      { id: 'n2', conteudo: 'Nota 2', createdAt: '2024-01-02', userId: 'u2' },
    ];
    render(<NotasList notas={notas} />);
    expect(screen.getAllByTestId('nota-item')).toHaveLength(2);
  });

  it('submete nota ao clicar em "Adicionar nota"', async () => {
    const onAddNota = vi.fn().mockResolvedValue(undefined);
    render(<NotasList notas={[]} onAddNota={onAddNota} />);

    fireEvent.change(screen.getByTestId('nota-input'), { target: { value: 'Minha nota' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Adicionar nota'));
    });
    expect(onAddNota).toHaveBeenCalledWith('Minha nota');
  });
});
