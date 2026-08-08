import Link from 'next/link';

/**
 * Layout raiz do grupo de rotas autenticadas.
 * Inclui sidebar com navegação principal.
 * O middleware já garante redirecionamento para /login se não autenticado.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">JurisRadar</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/dje"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Publicações DJE
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
