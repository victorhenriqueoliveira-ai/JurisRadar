import Link from 'next/link';
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed top-0 left-0 h-screen z-10">
        <div className="px-6 py-5 border-b border-gray-200">
          <Link href="/" className="text-lg font-bold text-gray-900 hover:text-gray-700">
            JurisRadar
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {/* DataJud */}
          <div>
            <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              DataJud
            </p>
            <Link
              href="/search"
              className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Buscar Processos
            </Link>
            <Link
              href="/history"
              className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Histórico
            </Link>
          </div>

          {/* DJE */}
          <div className="pt-3">
            <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Publicações DJE
            </p>
            <Link
              href="/dje"
              className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Busca
            </Link>
            <Link
              href="/dje/history"
              className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Histórico
            </Link>
          </div>
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 p-8 ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
