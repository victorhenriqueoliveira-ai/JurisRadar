'use client';

import type { ReactNode } from 'react';

export default function BuscaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm flex flex-col flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
