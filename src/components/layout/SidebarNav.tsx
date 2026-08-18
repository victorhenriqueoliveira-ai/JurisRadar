'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    group: 'DataJud',
    links: [
      { href: '/search', label: 'Buscar Processos' },
      { href: '/history', label: 'Histórico' },
    ],
  },
  {
    group: 'Publicações DJE',
    links: [
      { href: '/dje', label: 'Busca (legado)' },
      { href: '/dje/history', label: 'Histórico' },
    ],
  },
  {
    group: 'DJEN Nacional',
    links: [
      { href: '/djen-nacional', label: 'Busca DJEN' },
    ],
  },
];

export default function SidebarNav() {
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
