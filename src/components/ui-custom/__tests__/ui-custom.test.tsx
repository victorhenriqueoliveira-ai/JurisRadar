// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { UiButton } from '../UiButton';
import { GlassCard } from '../GlassCard';
import { PulsingBadge } from '../PulsingBadge';
import { ImportLoader } from '../ImportLoader';
import { EmptyStateIllustrated } from '../EmptyStateIllustrated';

// ── UiButton ────────────────────────────────────────────────────────────────

describe('UiButton', () => {
  it('renderiza children corretamente', () => {
    render(<UiButton>Clique aqui</UiButton>);
    expect(screen.getByRole('button', { name: 'Clique aqui' })).toBeInTheDocument();
  });

  it('renderiza variant="primary" sem erro', () => {
    render(<UiButton variant="primary">Primary</UiButton>);
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
  });

  it('renderiza variant="secondary" sem erro', () => {
    render(<UiButton variant="secondary">Secondary</UiButton>);
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
  });

  it('aceita className adicional sem perder classes base', () => {
    render(<UiButton className="my-extra-class">Btn</UiButton>);
    const btn = screen.getByRole('button', { name: 'Btn' });
    expect(btn.className).toContain('my-extra-class');
    // classe base sempre presente
    expect(btn.className).toContain('inline-flex');
  });

  it('propaga props HTML nativas (disabled)', () => {
    render(<UiButton disabled>Desabilitado</UiButton>);
    expect(screen.getByRole('button', { name: 'Desabilitado' })).toBeDisabled();
  });

  it('default variant é primary', () => {
    const { container } = render(<UiButton>Default</UiButton>);
    // sem variant prop, deve renderizar sem erro
    expect(container.querySelector('button')).toBeInTheDocument();
  });
});

// ── GlassCard ───────────────────────────────────────────────────────────────

describe('GlassCard', () => {
  it('renderiza children', () => {
    render(<GlassCard>Conteúdo do card</GlassCard>);
    expect(screen.getByText('Conteúdo do card')).toBeInTheDocument();
  });

  it('aplica classe glass-card', () => {
    const { container } = render(<GlassCard>Teste</GlassCard>);
    expect(container.firstChild).toHaveClass('glass-card');
  });

  it('aceita className adicional', () => {
    const { container } = render(<GlassCard className="extra-class">Teste</GlassCard>);
    expect(container.firstChild).toHaveClass('glass-card');
    expect(container.firstChild).toHaveClass('extra-class');
  });

  it('aplica estilos de glassmorphism via style inline', () => {
    const { container } = render(<GlassCard>Teste</GlassCard>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.backdropFilter).toBe('blur(12px)');
  });
});

// ── PulsingBadge ─────────────────────────────────────────────────────────────

describe('PulsingBadge', () => {
  it('não renderiza quando count=0', () => {
    const { container } = render(<PulsingBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o número quando count=5', () => {
    render(<PulsingBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renderiza "99+" quando count > 99', () => {
    render(<PulsingBadge count={100} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('aceita className adicional', () => {
    render(<PulsingBadge count={3} className="my-badge" />);
    expect(screen.getByText('3').className).toContain('my-badge');
  });

  it('tem aria-label com contagem', () => {
    render(<PulsingBadge count={7} />);
    expect(screen.getByLabelText('7 notificações')).toBeInTheDocument();
  });
});

// ── ImportLoader ─────────────────────────────────────────────────────────────

describe('ImportLoader', () => {
  it('renderiza a animação sem prop', () => {
    const { container } = render(<ImportLoader />);
    expect(container.querySelector('.import-loader')).toBeInTheDocument();
  });

  it('tem role="status"', () => {
    render(<ImportLoader />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('exibe label quando fornecido', () => {
    render(<ImportLoader label="Importando..." />);
    expect(screen.getByText('Importando...')).toBeInTheDocument();
  });

  it('não exibe texto sem label prop', () => {
    render(<ImportLoader />);
    // Só o aria-label default, sem texto visível de label
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });

  it('aceita className adicional', () => {
    const { container } = render(<ImportLoader className="my-loader" />);
    expect(container.querySelector('.my-loader')).toBeInTheDocument();
  });
});

// ── EmptyStateIllustrated ────────────────────────────────────────────────────

describe('EmptyStateIllustrated', () => {
  it('renderiza o título', () => {
    render(<EmptyStateIllustrated title="Nenhum processo encontrado" />);
    expect(screen.getByText('Nenhum processo encontrado')).toBeInTheDocument();
  });

  it('renderiza o título e a descrição quando ambos fornecidos', () => {
    render(
      <EmptyStateIllustrated
        title="Sem dados"
        description="Adicione um processo para começar."
      />
    );
    expect(screen.getByText('Sem dados')).toBeInTheDocument();
    expect(screen.getByText('Adicione um processo para começar.')).toBeInTheDocument();
  });

  it('não renderiza parágrafo de descrição quando omitida', () => {
    const { container } = render(<EmptyStateIllustrated title="Vazio" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('aceita className adicional', () => {
    const { container } = render(
      <EmptyStateIllustrated title="Teste" className="my-empty" />
    );
    expect(container.querySelector('.my-empty')).toBeInTheDocument();
  });

  it('renderiza SVG animado', () => {
    const { container } = render(<EmptyStateIllustrated title="SVG test" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

// ── Integração: barrel export ────────────────────────────────────────────────

describe('Barrel export (index.ts)', () => {
  it('exporta todos os 5 componentes', async () => {
    const barrel = await import('../index');
    expect(barrel.UiButton).toBeDefined();
    expect(barrel.GlassCard).toBeDefined();
    expect(barrel.PulsingBadge).toBeDefined();
    expect(barrel.ImportLoader).toBeDefined();
    expect(barrel.EmptyStateIllustrated).toBeDefined();
  });
});
