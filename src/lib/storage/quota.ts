/**
 * Verificação de quota de armazenamento por escritório (org).
 *
 * Limite definido no ADR-005: 500 MB por escritório.
 * Consulta a soma de `tamanho` na tabela `anexos` filtrada por `org_id`.
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { StorageError } from './validation';

/** Quota máxima por escritório em bytes (500 MB) */
export const MAX_QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Retorna o total de bytes consumidos pelo escritório na tabela `anexos`.
 * Retorna 0 caso não existam registros.
 */
export async function getUsedQuotaBytes(orgId: string): Promise<number> {
  const result = await db.execute(
    sql`SELECT COALESCE(SUM(tamanho), 0)::bigint AS total FROM anexos WHERE org_id = ${orgId}`,
  );

  const rows = result.rows as Array<{ total: string | number }>;
  if (!rows || rows.length === 0) return 0;

  return Number(rows[0].total ?? 0);
}

/**
 * Verifica se o escritório possui quota disponível para um upload de `fileSizeBytes` bytes.
 * Lança `StorageError` com código `QUOTA_EXCEEDED` se a quota seria ultrapassada.
 */
export async function checkQuota(orgId: string, fileSizeBytes: number): Promise<void> {
  const used = await getUsedQuotaBytes(orgId);

  if (used + fileSizeBytes > MAX_QUOTA_BYTES) {
    const usedMB = (used / (1024 * 1024)).toFixed(1);
    const limitMB = (MAX_QUOTA_BYTES / (1024 * 1024)).toFixed(0);
    throw new StorageError(
      'QUOTA_EXCEEDED',
      `Quota de armazenamento excedida. Uso atual: ${usedMB} MB de ${limitMB} MB.`,
    );
  }
}
