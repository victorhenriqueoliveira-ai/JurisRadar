import Link from 'next/link';
import type { ReactNode } from 'react';

export function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-5 px-5 md:px-14 py-4 bg-white/95 backdrop-blur border-b border-[#e5e7eb]">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-[34px] h-[34px] rounded-[10px] bg-[#0f2d5e] text-white flex items-center justify-center text-[14px] font-extrabold shrink-0"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            JR
          </div>
          <span className="font-extrabold text-[18px] text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            JurisRadar
          </span>
        </Link>
        <Link href="/register" className="text-sm font-semibold text-[#0f2d5e] hover:underline">
          Voltar ao cadastro
        </Link>
      </header>

      <main className="max-w-[720px] mx-auto px-5 md:px-0 py-14">
        <h1
          className="font-extrabold text-3xl md:text-4xl text-[#0f2d5e] mb-2 tracking-[-0.01em]"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {title}
        </h1>
        <p className="text-sm text-[#6b7280] mb-10">Última atualização: {updatedAt}</p>

        <div className="legal-prose">{children}</div>
      </main>

      <footer className="border-t border-[#e5e7eb] px-5 md:px-14 py-8 text-center text-xs text-[#9ca3af]">
        © {new Date().getFullYear()} JurisRadar · Todos os direitos reservados
      </footer>

      <style>{`
        .legal-prose h2 {
          font-family: Manrope, sans-serif;
          font-weight: 800;
          font-size: 1.25rem;
          color: #0f2d5e;
          margin-top: 2.25rem;
          margin-bottom: 0.75rem;
        }
        .legal-prose h2:first-child { margin-top: 0; }
        .legal-prose p {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: #374151;
          margin-bottom: 0.9rem;
        }
        .legal-prose ul {
          margin: 0 0 0.9rem 1.25rem;
          padding: 0;
          list-style: disc;
        }
        .legal-prose li {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: #374151;
          margin-bottom: 0.4rem;
        }
        .legal-prose strong { color: #111827; }
        .legal-prose a { color: #0f2d5e; font-weight: 600; text-decoration: underline; }
      `}</style>
    </div>
  );
}
