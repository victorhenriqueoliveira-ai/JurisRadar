'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Search,
  Calendar,
  Bell,
  DollarSign,
  Settings,
} from 'lucide-react';
import { GlassCard } from '@/components/ui-custom/GlassCard';

export const navItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/crm', label: 'CRM', icon: FileText },
  { href: '/app/busca', label: 'Busca', icon: Search },
  { href: '/app/calendario', label: 'Calendário', icon: Calendar },
  { href: '/app/notificacoes', label: 'Notificações', icon: Bell },
  { href: '/app/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/app/configuracoes', label: 'Configurações', icon: Settings },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-2">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
            `}
          >
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="hidden xl:block">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Sidebar — fixa em desktop (≥1280px) com ícone + label.
 * Em tablet (768–1279px): ícones apenas (label oculto via CSS).
 * Em mobile (<768px): oculta — usar SidebarMobile via AppHeader.
 */
export function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-16 xl:w-64 shrink-0 border-r border-border"
      aria-label="Sidebar de navegação"
    >
      <GlassCard className="flex flex-col flex-1 !p-0 !rounded-none h-full">
        {/* Logo */}
        <div className="flex items-center justify-center xl:justify-start gap-2 px-3 py-5 border-b border-border xl:px-4">
          <span className="font-bold text-lg hidden xl:block">JurisRadar</span>
          <span className="font-bold text-lg xl:hidden">JR</span>
        </div>

        <SidebarContent />
      </GlassCard>
    </aside>
  );
}
