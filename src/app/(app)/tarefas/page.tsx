import { Suspense } from 'react';
import { requireOrgContext } from '@/lib/org-context';
import { listTarefas } from '@/services/tarefas';
import TarefasList from './TarefasList';

async function TarefasContent() {
  const ctx = await requireOrgContext();
  const tarefas = await listTarefas(ctx);
  return <TarefasList initialData={tarefas} />;
}

export default function TarefasPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
      <TarefasContent />
    </Suspense>
  );
}
