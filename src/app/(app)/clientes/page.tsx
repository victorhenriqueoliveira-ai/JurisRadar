import { Suspense } from 'react';
import { requireOrgContext } from '@/lib/org-context';
import { listClientes } from '@/services/clientes';
import ClientesList from './ClientesList';

async function ClientesContent() {
  const ctx = await requireOrgContext();
  const clientes = await listClientes(ctx);
  return <ClientesList initialData={clientes} />;
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
      <ClientesContent />
    </Suspense>
  );
}
