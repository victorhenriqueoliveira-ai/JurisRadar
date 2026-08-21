'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Kanban,
  Radar,
  Database,
  Search,
  Newspaper,
  CalendarClock,
  Wallet,
  Bell,
  Settings,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Início',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Processos',
    items: [
      { href: '/crm', label: 'CRM', icon: Kanban },
    ],
  },
  {
    title: 'Buscas de casos',
    items: [
      { href: '/busca/djen-nacional', label: 'DJEN Nacional', icon: Radar },
      { href: '/busca/datajud', label: 'DataJud / CNJ', icon: Database },
      { href: '/busca/dje', label: 'DJe TJSP', icon: Newspaper },
      { href: '/busca/pje', label: 'PJe Nacional', icon: Search },
    ],
  },
  {
    title: 'Agenda',
    items: [
      { href: '/calendario', label: 'Calendário', icon: CalendarClock },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { href: '/financeiro', label: 'Honorários', icon: Wallet },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/notificacoes', label: 'Notificações', icon: Bell },
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
];

export function SidebarContent({ onNavigate, showLabels = false }: { onNavigate?: () => void; showLabels?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3.5 py-3 flex-1 overflow-y-auto">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p
            className={`px-2.5 pb-1.5 text-[11px] font-bold tracking-[.06em] uppercase text-gray-400 select-none ${showLabels ? '' : 'hidden xl:block'}`}
            style={{ paddingTop: section.title === 'Início' ? '12px' : '16px' }}
          >
            {section.title}
          </p>

          {section.items.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                title={label}
                className={`
                  flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors mb-0.5
                  ${isActive
                    ? 'bg-[#0f2d5e] text-white font-semibold'
                    : 'text-[#374151] font-medium hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-[17px] h-[17px] shrink-0" aria-hidden="true" />
                <span className={showLabels ? 'truncate' : 'hidden xl:block truncate'}>{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-14 xl:w-[248px] shrink-0 border-r border-[#e5e7eb] bg-white h-full"
      aria-label="Sidebar de navegação"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 rounded-[9px] bg-[#0f2d5e] flex items-center justify-center shrink-0">
          <span className="text-white font-extrabold text-[13px]" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</span>
        </div>
        <span className="font-extrabold text-[16px] text-[#0f2d5e] hidden xl:block" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
      </div>

      <SidebarContent />
    </aside>
  );
}

export const navItems = NAV_SECTIONS.flatMap((s) => s.items);
