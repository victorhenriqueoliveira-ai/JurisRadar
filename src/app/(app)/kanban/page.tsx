import { Suspense } from 'react';
import { requireOrgContext } from '@/lib/org-context';
import { listKanbanCards } from '@/services/kanban';
import KanbanBoard from './KanbanBoard';

async function KanbanContent() {
  try {
    const ctx = await requireOrgContext();
    const data = await listKanbanCards(ctx);
    return <KanbanBoard initialData={data} />;
  } catch {
    return <KanbanBoard initialData={{ a_fazer: [], em_andamento: [], aguardando: [], concluido: [] }} />;
  }
}

export default function KanbanPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
      <KanbanContent />
    </Suspense>
  );
}
