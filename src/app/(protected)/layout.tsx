import Link from 'next/link';
import SidebarNav from '@/components/layout/SidebarNav';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed top-0 left-0 h-screen z-10">
        <div className="px-6 py-5 border-b border-gray-200">
          <Link href="/" className="text-lg font-bold text-gray-900 hover:text-gray-700">
            JurisRadar
          </Link>
        </div>

        <SidebarNav />
      </aside>

      <main className="flex-1 p-8 ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
