'use client';

import Link from 'next/link';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { Bell, Sun, Moon, LogOut, User, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { PulsingBadge } from '@/components/ui-custom/PulsingBadge';
import { SidebarMobile } from './SidebarMobile';
import { NotificacoesSheet } from './NotificacoesSheet';

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
 * - Sino de notificações com PulsingBadge e polling de 30s
 * - Painel lateral (NotificacoesSheet) acionado pelo sino
 * - Dark mode toggle
 * - Avatar com dropdown (perfil, configurações, logout)
 * - Botão hambúrguer mobile (SidebarMobile)
 */
export function AppHeader({ session, notificationCount: initialCount = 0 }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [notificationCount, setNotificationCount] = useState(initialCount);
  const [sheetOpen, setSheetOpen] = useState(false);

  const userName = session.user?.name ?? session.user?.email ?? 'Usuário';
  const initials = getInitials(session.user?.name, session.user?.email);

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  // Polling de 30s para atualizar contagem de notificações não lidas
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notificacoes/count');
      if (!res.ok) return;
      const json = await res.json() as { count: number };
      setNotificationCount(json.count ?? 0);
    } catch {
      // silenciar erros de rede no polling
    }
  }, []);

  useEffect(() => {
    // Buscar imediatamente ao montar
    fetchCount();

    // Configurar polling a cada 30s
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <>
      <NotificacoesSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCountUpdate={setNotificationCount}
      />
      <header className="flex items-center gap-4 px-8 py-[18px] bg-white border-b border-[#e5e7eb] shrink-0">
        <SidebarMobile />

        {/* Título da página / nome */}
        <h4
          className="m-0 mr-auto text-[#0f2d5e] font-extrabold text-base truncate"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {userName}
        </h4>

        {/* Sino de notificações */}
        <button
          type="button"
          aria-label={`Notificações${notificationCount > 0 ? `: ${notificationCount} não lidas` : ''}`}
          onClick={() => setSheetOpen(true)}
          className="relative w-[38px] h-[38px] rounded-xl bg-[#f3f4f6] flex items-center justify-center hover:bg-[#e5e7eb] transition-colors"
        >
          <Bell className="w-[18px] h-[18px] text-[#374151]" aria-hidden="true" />
          <span className="absolute -top-0.5 -right-0.5">
            <PulsingBadge count={notificationCount} />
          </span>
        </button>

        {/* Avatar com dropdown */}
        <div className="relative bg-white group">
          <button
            type="button"
            aria-label="Menu do usuário"
            className="flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#0f2d5e] text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
          >
            {initials}
          </button>
          <div
            role="menu"
            className="hidden group-focus-within:block absolute right-0 mt-1 w-44 rounded-xl border border-[#e5e7eb] bg-white shadow-lg p-1 z-50"
          >
            <Link
              role="menuitem"
              href="/configuracoes"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-[#f3f4f6] transition-colors text-[#374151]"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              Perfil
            </Link>
            <Link
              role="menuitem"
              href="/configuracoes"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-[#f3f4f6] transition-colors text-[#374151]"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
              Configurações
            </Link>
            <hr className="my-1 border-[#f3f4f6]" />
            <button
              role="menuitem"
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
