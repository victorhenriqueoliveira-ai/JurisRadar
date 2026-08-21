'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Search,
  LogOut,
  Radar,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/faturamento', label: 'Faturamento', icon: CreditCard },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 min-h-screen bg-[#0f2d5e] flex flex-col py-6 px-4 gap-1">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <Radar className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-extrabold text-sm leading-none" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</p>
          <p className="text-white/50 text-[10px] font-medium tracking-widest uppercase mt-0.5">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sair */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-colors mt-2"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        Sair
      </button>
    </aside>
  );
}
