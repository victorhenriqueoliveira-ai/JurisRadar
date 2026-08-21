/**
 * Helper para ler preferências de notificação por usuário.
 *
 * Lê a coluna `notification_prefs` (jsonb) da tabela `users`.
 * Retorna null se o usuário não tiver preferências configuradas.
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import type { NotificationPrefs } from '@/db/schema';

/**
 * Busca as preferências de notificação de um usuário.
 *
 * @param userId - UUID do usuário
 * @returns NotificationPrefs ou null se não encontrado ou sem prefs
 */
export async function getNotificacaoPrefs(
  userId: string,
): Promise<NotificationPrefs | null> {
  const rows = await db
    .select({ notificationPrefs: users.notificationPrefs, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0].notificationPrefs ?? null;
}

/**
 * Busca o e-mail de um usuário pelo id.
 *
 * @param userId - UUID do usuário
 * @returns e-mail ou null se não encontrado
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0]?.email ?? null;
}

/**
 * Verifica se o e-mail para um tipo de notificação está desativado.
 *
 * @param prefs - preferências do usuário (pode ser null)
 * @param tipo - tipo da notificação (ex: 'intimacao', 'decisao')
 * @returns true se o e-mail estiver desativado para esse tipo
 */
export function isEmailDesativado(
  prefs: NotificationPrefs | null,
  tipo: string,
): boolean {
  return prefs?.emailDesativado?.includes(tipo) ?? false;
}
