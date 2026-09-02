// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPathname = vi.fn(() => '/dashboard');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

vi.mock('@/components/layout/SidebarMobile', () => ({
  SidebarMobile: () => <button aria-label="Abrir menu de navegação" className="md:hidden" />,
}));

// Impede que notificacao-dispatcher (importado via NotificacoesSheet) acesse @/db
vi.mock('@/inngest/notificacao-dispatcher', () => ({
  TIPOS_CRITICOS: ['prazo_critico', 'nova_movimentacao'],
  TIPOS_RELEVANTES: ['prazo_critico', 'nova_movimentacao'],
}));

vi.mock('@/components/layout/NotificacoesSheet', () => ({
  NotificacoesSheet: () => null,
}));

// ── Imports dos componentes ────────────────────────────────────────────────

import { SidebarContent, navItems } from '../Sidebar';
import { AppHeader } from '../AppHeader';

// ── Testes: Sidebar ────────────────────────────────────────────────────────

describe('SidebarContent', () => {
  it('renderiza todos os itens de navegação', () => {
    render(<SidebarContent />);
    expect(navItems.length).toBeGreaterThanOrEqual(7);
    for (const item of navItems) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it('aplica aria-current="page" apenas no item ativo (Dashboard)', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<SidebarContent />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');

    const crmLink = screen.getByText('CRM').closest('a');
    expect(crmLink).not.toHaveAttribute('aria-current');
  });

  it('aplica aria-current="page" apenas no item CRM quando rota é /crm', () => {
    mockPathname.mockReturnValue('/crm');
    render(<SidebarContent />);

    const crmLink = screen.getByText('CRM').closest('a');
    expect(crmLink).toHaveAttribute('aria-current', 'page');

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).not.toHaveAttribute('aria-current');
  });

  it('chama onNavigate ao clicar em um item', () => {
    mockPathname.mockReturnValue('/dashboard');
    const onNavigate = vi.fn();
    render(<SidebarContent onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('CRM'));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('cada item de navegação tem href sem prefixo /app/', () => {
    for (const item of navItems) {
      expect(item.href).not.toMatch(/^\/app\//);
    }
  });
});

// ── Testes: AppHeader ──────────────────────────────────────────────────────

describe('AppHeader', () => {
  const mockSession = {
    user: {
      name: 'Victor Oliveira',
      email: 'victor@test.com',
      id: 'user-1',
    },
    expires: '2099-01-01',
  } as Parameters<typeof AppHeader>[0]['session'];

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0 }),
    });
  });

  it('renderiza nome do usuário da sessão', () => {
    render(<AppHeader session={mockSession} />);
    expect(screen.getByText('Victor Oliveira')).toBeInTheDocument();
  });

  it('renderiza iniciais do usuário no avatar', () => {
    render(<AppHeader session={mockSession} />);
    expect(screen.getByText('VO')).toBeInTheDocument();
  });

  it('renderiza botão de notificações', () => {
    render(<AppHeader session={mockSession} />);
    expect(screen.getByRole('button', { name: /notificações/i })).toBeInTheDocument();
  });

  it('renderiza botão hambúrguer mobile via SidebarMobile', () => {
    render(<AppHeader session={mockSession} />);
    expect(screen.getByRole('button', { name: /abrir menu de navegação/i })).toBeInTheDocument();
  });

  it('renderiza email como nome quando name é null', () => {
    const sessionSemNome = {
      user: { name: null, email: 'victor@test.com', id: 'user-1' },
      expires: '2099-01-01',
    } as Parameters<typeof AppHeader>[0]['session'];
    render(<AppHeader session={sessionSemNome} />);
    expect(screen.getByText('victor@test.com')).toBeInTheDocument();
  });
});

// ── Testes: navItems ───────────────────────────────────────────────────────

describe('navItems', () => {
  it('contém ao menos 7 itens', () => {
    expect(navItems.length).toBeGreaterThanOrEqual(7);
  });

  it('contém Dashboard como primeiro item', () => {
    expect(navItems[0].href).toBe('/dashboard');
    expect(navItems[0].label).toBe('Dashboard');
  });

  it('contém Configurações como último item', () => {
    expect(navItems[navItems.length - 1].href).toBe('/configuracoes');
    expect(navItems[navItems.length - 1].label).toBe('Configurações');
  });
});
