import { Suspense } from 'react';
import { requireOrgContext } from '@/lib/org-context';
import { getPerfilUsuario } from '@/services/perfil';
import PerfilForm from './PerfilForm';

const EMPTY_PERFIL = { id: '', name: null, email: null, oabNumero: null, oabEstado: null };

async function PerfilContent() {
  try {
    const ctx = await requireOrgContext();
    const perfil = await getPerfilUsuario(ctx);
    return <PerfilForm initialData={perfil} />;
  } catch {
    return <PerfilForm initialData={EMPTY_PERFIL} />;
  }
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
      <PerfilContent />
    </Suspense>
  );
}
