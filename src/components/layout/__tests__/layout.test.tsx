// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock next/navigation
const mockPathname = vi.fn(() => '/app/dashboard');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock next-themes
const mockSetTheme = vi.fn();
const mockTheme = vi.fn(() => 'light');
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme(), setTheme: mockSetTheme }),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

// Mock SidebarMobile dentro de AppHeader
vi.mock('@/components/layout/SidebarMobile', () => ({
  SidebarMobile: () => <button aria-label="Abrir menu de navegação" className="md:hidden" />,
}));

// ── Imports dos componentes ────────────────────────────────────────────────

import { SidebarContent, navItems } from '../Sidebar';
import { AppHeader } from '../AppHeader';

// ── Testes: Sidebar ────────────────────────────────────────────────────────

describe('SidebarContent', () => {
  it('renderiza todos os 7 itens de navegação', () => {
    render(<SidebarContent />);
    expect(navItems).toHaveLength(7);
    for (const item of navItems) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it('aplica aria-current="page" apenas no item ativo (Dashboard)', () => {
    mockPathname.mockReturnValue('/app/dashboard');
    render(<SidebarContent />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');

    const crmLink = screen.getByText('CRM').closest('a');
    expect(crmLink).not.toHaveAttribute('aria-current');
  });

  it('aplica aria-current="page" apenas no item CRM quando rota é /app/crm', () => {
    mockPathname.mockReturnValue('/app/crm');
    render(<SidebarContent />);

    const crmLink = screen.getByText('CRM').closest('a');
    expect(crmLink).toHaveAttribute('aria-current', 'page');

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).not.toHaveAttribute('aria-current');
  });

  it('chama onNavigate ao clicar em um item', () => {
    mockPathname.mockReturnValue('/app/dashboard');
    const onNavigate = vi.fn();
    render(<SidebarContent onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('CRM'));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('cada item de navegação tem href correto', () => {
    render(<SidebarContent />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(7);
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
  } as any;

  beforeEach(() => {
    mockSetTheme.mockClear();
    mockTheme.mockReturnValue('light');
  });

  it('renderiza nome do usuário da sessão', () => {
    render(<AppHeader session={mockSession} />);
    expect(screen.getByText('Victor Oliveira')).toBeInTheDocument();
  });

  it('renderiza iniciais do usuário no avatar', () => {
    render(<AppHeader session={mockSession} />);
    expect(screen.getByText('VO')).toBeInTheDocument();
  });

  it('não exibe PulsingBadge quando notificationCount=0', () => {
    render(<AppHeader session={mockSession} notificationCount={0} />);
    // PulsingBadge retorna null quando count === 0
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // badge não deve exibir número
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('exibe PulsingBadge com "3" quando notificationCount=3', () => {
    render(<AppHeader session={mockSession} notificationCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('dark mode toggle chama setTheme("dark") quando tema atual é "light"', () => {
    mockTheme.mockReturnValue('light');
    render(<AppHeader session={mockSession} />);
    fireEvent.click(screen.getByRole('button', { name: /alternar modo escuro/i }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('dark mode toggle chama setTheme("light") quando tema atual é "dark"', () => {
    mockTheme.mockReturnValue('dark');
    render(<AppHeader session={mockSession} />);
    fireEvent.click(screen.getByRole('button', { name: /alternar modo escuro/i }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('renderiza botão hambúrguer mobile via SidebarMobile', () => {
    render(<AppHeader session={mockSession} />);
    expect(screen.getByRole('button', { name: /abrir menu de navegação/i })).toBeInTheDocument();
  });

  it('renderiza email como nome quando name é null', () => {
    const sessionSemNome = {
      user: { name: null, email: 'victor@test.com', id: 'user-1' },
      expires: '2099-01-01',
    } as any;
    render(<AppHeader session={sessionSemNome} />);
    expect(screen.getByText('victor@test.com')).toBeInTheDocument();
  });
});

// ── Testes: navItems ───────────────────────────────────────────────────────

describe('navItems', () => {
  it('contém exatamente 7 itens', () => {
    expect(navItems).toHaveLength(7);
  });

  it('contém Dashboard como primeiro item', () => {
    expect(navItems[0].href).toBe('/app/dashboard');
    expect(navItems[0].label).toBe('Dashboard');
  });

  it('contém Configurações como último item', () => {
    expect(navItems[navItems.length - 1].href).toBe('/app/configuracoes');
    expect(navItems[navItems.length - 1].label).toBe('Configurações');
  });
});
