import { redirect } from 'next/navigation';

/**
 * /perfil foi unificado com /configuracoes?aba=perfil (Fase 5 da auditoria) —
 * ambas telas gerenciavam os mesmos dados de usuário de forma divergente.
 */
export default function PerfilPage() {
  redirect('/configuracoes?aba=perfil');
}
