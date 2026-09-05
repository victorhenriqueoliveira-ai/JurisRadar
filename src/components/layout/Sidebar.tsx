'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Kanban,
  Radar,
  Database,
  Search,
  Newspaper,
  CalendarClock,
  Wallet,
  ChevronRight,
  CheckSquare,
  Scale,
  Users,
  Briefcase,
  UserCircle,
  Building2,
  FileText,
} from 'lucide-react';

type NavSubItem = {
  href: string;
  label: string;
  accent?: boolean; // IA items — destaque roxo
  manual?: boolean; // Manual items — destaque azul
  icon?: React.ComponentType<{ className?: string }>;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavSubItem[];
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
    title: 'Produtividade',
    items: [
      { href: '/tarefas', label: 'Tarefas', icon: CheckSquare },
      { href: '/kanban', label: 'Kanban', icon: Kanban },
    ],
  },
  {
    title: 'Processos',
    items: [
      { href: '/crm', label: 'CRM', icon: Scale },
      { href: '/processos', label: 'Processos', icon: FileText },
      { href: '/casos', label: 'Casos / Investigações', icon: Search },
    ],
  },
  {
    title: 'Buscas de casos',
    items: [
      {
        href: '/busca/djen-nacional',
        label: 'DJEN Nacional',
        icon: Radar,
        children: [
          { href: '/busca/djen-nacional', label: 'Busca Manual', icon: Search },
          { href: '/busca/djen-nacional?mode=ia', label: 'Busca com IA', accent: true },
        ],
      },
      {
        href: '/busca/datajud',
        label: 'DataJud / CNJ',
        icon: Database,
        children: [
          { href: '/busca/datajud', label: 'Busca Manual', icon: Search },
        ],
      },
      {
        href: '/busca/dje',
        label: 'DJe TJSP',
        icon: Newspaper,
        children: [
          { href: '/busca/dje', label: 'Busca Manual', icon: Search },
        ],
      },
      {
        href: '/busca/pje',
        label: 'PJe Nacional',
        icon: Search,
        children: [
          { href: '/busca/pje', label: 'Busca Manual', icon: Search },
        ],
      },
    ],
  },
  {
    title: 'Relacionamentos',
    items: [
      { href: '/clientes', label: 'Clientes & Empresas', icon: Users },
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
      { href: '/consultorias', label: 'Consultorias', icon: Briefcase },
    ],
  },
  {
    title: 'Escritório',
    items: [
      { href: '/configuracoes/escritorio', label: 'Equipe & Plano', icon: Building2 },
      { href: '/perfil', label: 'Meu perfil', icon: UserCircle },
    ],
  },
];

function NavItemComponent({
  item,
  pathname,
  mode,
  showLabels,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  mode: string | null;
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  const isParentActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = Boolean(item.children?.length);
  const [expanded, setExpanded] = useState(isParentActive);

  // Sincroniza expansão quando rota muda
  useEffect(() => {
    if (isParentActive) setExpanded(true);
  }, [isParentActive]);

  function isChildActive(child: NavSubItem): boolean {
    const [childPath, childQuery] = child.href.split('?');
    const childMode = childQuery ? new URLSearchParams(childQuery).get('mode') : null;
    if (pathname !== childPath) return false;
    if (childMode === 'ia') return mode === 'ia';
    // manual: sem ?mode ou ?mode=manual
    return !mode || mode === 'manual';
  }

  if (!hasChildren) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        title={item.label}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors mb-0.5 ${
          isActive ? 'bg-[#0f2d5e] text-white font-semibold' : 'text-[#374151] font-medium hover:bg-gray-100'
        }`}
      >
        <item.icon className="w-[17px] h-[17px] shrink-0" />
        <span className={showLabels ? 'truncate' : 'hidden xl:block truncate'}>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="mb-0.5">
      {/* Item pai — clicável para expandir ou navegar */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
          isParentActive && !expanded
            ? 'bg-[#0f2d5e] text-white font-semibold'
            : isParentActive
            ? 'text-[#0f2d5e] font-semibold bg-blue-50'
            : 'text-[#374151] font-medium hover:bg-gray-100'
        }`}
      >
        <item.icon className="w-[17px] h-[17px] shrink-0" />
        <span className={`flex-1 text-left ${showLabels ? 'truncate' : 'hidden xl:block truncate'}`}>{item.label}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''} ${showLabels ? '' : 'hidden xl:block'}`}
        />
      </button>

      {/* Sub-itens */}
      {expanded && (
        <div className={`mt-0.5 space-y-0.5 ${showLabels ? 'pl-8' : 'pl-0 xl:pl-8'}`}>
          {item.children!.map((child) => {
            const active = isChildActive(child);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? child.accent
                      ? 'bg-purple-100 text-purple-800 font-semibold'
                      : 'bg-[#0f2d5e]/10 text-[#0f2d5e] font-semibold'
                    : 'text-[#6b7280] hover:bg-gray-100 hover:text-[#374151]'
                }`}
              >
                {child.accent && (
                  <span className={`text-[10px] ${active ? 'text-purple-600' : 'text-purple-400'}`}>✦</span>
                )}
                <span className={showLabels ? '' : 'hidden xl:block'}>{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarContent({ onNavigate, showLabels = false }: { onNavigate?: () => void; showLabels?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

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
          {section.items.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              pathname={pathname}
              mode={mode}
              showLabels={showLabels}
              onNavigate={onNavigate}
            />
          ))}
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
