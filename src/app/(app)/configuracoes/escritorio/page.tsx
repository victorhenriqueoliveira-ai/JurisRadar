import { Suspense } from 'react';
import { requireOrgContext } from '@/lib/org-context';
import { getEquipe, getPlanoAtual, getOrganizacao } from '@/services/escritorio';
import EscritorioClient from './EscritorioClient';

async function EscritorioContent() {
  try {
    const ctx = await requireOrgContext();
    const [equipe, plano, organizacao] = await Promise.all([
      getEquipe(ctx),
      getPlanoAtual(ctx),
      getOrganizacao(ctx),
    ]);
    return <EscritorioClient equipe={equipe} plano={plano} organizacao={organizacao} />;
  } catch {
    return <EscritorioClient equipe={[]} plano={null} organizacao={null} />;
  }
}

export default function EscritorioPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
      <EscritorioContent />
    </Suspense>
  );
}
