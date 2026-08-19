'use client';

import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { Bell, Sun, Moon, LogOut, User, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { PulsingBadge } from '@/components/ui-custom/PulsingBadge';
import { SidebarMobile } from './SidebarMobile';

interface AppHeaderProps {
  session: Session;
  notificationCount?: number;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return 'U';
}

/**
 * AppHeader — cabeçalho fixo da área autenticada.
 * - Nome do escritório (name da sessão)
 * - Sino de notificações com PulsingBadge
 * - Dark mode toggle
 * - Avatar com dropdown (perfil, configurações, logout)
 * - Botão hambúrguer mobile (SidebarMobile)
 */
export function AppHeader({ session, notificationCount = 0 }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();

  const userName = session.user?.name ?? session.user?.email ?? 'Usuário';
  const initials = getInitials(session.user?.name, session.user?.email);

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-3 shrink-0">
      {/* Botão hambúrguer — apenas mobile */}
      <SidebarMobile />

      {/* Nome do escritório */}
      <span className="font-semibold text-sm truncate flex-1">
        {userName}
      </span>

      {/* Sino de notificações */}
      <button
        type="button"
        aria-label={`Notificações${notificationCount > 0 ? `: ${notificationCount} não lidas` : ''}`}
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        <span className="absolute -top-0.5 -right-0.5">
          <PulsingBadge count={notificationCount} />
        </span>
      </button>

      {/* Dark mode toggle */}
      <button
        type="button"
        aria-label="Alternar modo escuro"
        onClick={toggleTheme}
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" aria-hidden="true" />
        ) : (
          <Moon className="w-5 h-5" aria-hidden="true" />
        )}
      </button>

      {/* Avatar dropdown simples */}
      <div className="relative group">
        <button
          type="button"
          aria-label="Menu do usuário"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
        >
          {initials}
        </button>
        {/* Dropdown */}
        <div
          role="menu"
          className="hidden group-focus-within:block absolute right-0 mt-1 w-44 rounded-lg border border-border bg-popover shadow-md p-1 z-50"
        >
          <button
            role="menuitem"
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
          >
            <User className="w-4 h-4" aria-hidden="true" />
            Perfil
          </button>
          <button
            role="menuitem"
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            Configurações
          </button>
          <hr className="my-1 border-border" />
          <button
            role="menuitem"
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
