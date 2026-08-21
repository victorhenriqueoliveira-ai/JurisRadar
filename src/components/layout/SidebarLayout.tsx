'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    group: 'BUSCAS',
    links: [
      { href: '/djen-nacional', label: 'DJEN Nacional' },
      { href: '/search', label: 'DataJud / CNJ' },
      { href: '/dje', label: 'DJe TJSP' },
    ],
  },
  {
    group: 'HISTÓRICO',
    links: [
      { href: '/history', label: 'Histórico DataJud' },
      { href: '/dje/history', label: 'Histórico DJe' },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-4 py-4 space-y-1">
      {navItems.map((section) => (
        <div key={section.group}>
          <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {section.group}
          </p>
          {section.links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200
          flex flex-col z-30 transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:z-10
        `}
      >
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold text-gray-900 hover:text-gray-700"
            onClick={() => setOpen(false)}
          >
            JurisRadar
          </Link>
          <button
            type="button"
            className="lg:hidden p-1 rounded text-gray-400 hover:text-gray-600"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <NavLinks onNavigate={() => setOpen(false)} />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="p-1 rounded text-gray-500 hover:text-gray-700"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-gray-900">JurisRadar</span>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
