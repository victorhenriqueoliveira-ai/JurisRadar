import { Suspense } from 'react';
import { requireOrgContext } from '@/lib/org-context';
import { listConsultorias } from '@/services/consultorias';
import ConsultoriasList from './ConsultoriasList';

async function ConsultoriasContent() {
  try {
    const ctx = await requireOrgContext();
    const consultorias = await listConsultorias(ctx);
    return <ConsultoriasList initialData={consultorias} />;
  } catch {
    return <ConsultoriasList initialData={[]} />;
  }
}

export default function ConsultoriasPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
      <ConsultoriasContent />
    </Suspense>
  );
}
