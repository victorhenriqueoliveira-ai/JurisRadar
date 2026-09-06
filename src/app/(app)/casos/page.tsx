import { Suspense } from 'react';
import { requireOrgContext } from '@/lib/org-context';
import { listCasos } from '@/services/casos';
import CasosList from './CasosList';

async function CasosContent() {
  try {
    const ctx = await requireOrgContext();
    const casos = await listCasos(ctx);
    return <CasosList initialData={casos} />;
  } catch {
    return <CasosList initialData={[]} />;
  }
}

export default function CasosPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
      <CasosContent />
    </Suspense>
  );
}
