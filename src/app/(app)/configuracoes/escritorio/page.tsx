import { Suspense } from 'react';
import { requireOrgContext } from '@/lib/org-context';
import { getEquipe, getPlanoAtual } from '@/services/escritorio';
import EscritorioClient from './EscritorioClient';

async function EscritorioContent() {
  try {
    const ctx = await requireOrgContext();
    const [equipe, plano] = await Promise.all([getEquipe(ctx), getPlanoAtual(ctx)]);
    return <EscritorioClient equipe={equipe} plano={plano} />;
  } catch {
    return <EscritorioClient equipe={[]} plano={null} />;
  }
}

export default function EscritorioPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
      <EscritorioContent />
    </Suspense>
  );
}
