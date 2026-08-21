'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from './Sidebar';

/**
 * SidebarMobile — drawer lateral Sheet para mobile (<768px).
 * Fecha automaticamente ao navegar.
 */
export function SidebarMobile() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir menu de navegação"
        className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-white">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-[9px] bg-[#0f2d5e] flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-[13px]" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</span>
          </div>
          <span className="font-bold text-lg">JurisRadar</span>
        </div>
        <SidebarContent onNavigate={() => setOpen(false)} showLabels />
      </SheetContent>
    </Sheet>
  );
}
