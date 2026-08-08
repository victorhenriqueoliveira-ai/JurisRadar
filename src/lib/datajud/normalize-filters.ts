import { createHash } from 'crypto';
import type { SearchFilters } from './types';

/**
 * Serializa os filtros de busca de forma determinística — chaves e arrays são
 * ordenados alfabeticamente antes da serialização — e retorna o hash SHA-256.
 *
 * Garante que `{ grau: ['G2', 'G1'] }` e `{ grau: ['G1', 'G2'] }` produzam
 * o mesmo hash, independente da ordem de entrada.
 */
export function normalizeFilters(filters: SearchFilters): string {
  const normalized = sortObjectKeys(filters as unknown as Record<string, unknown>);
  const json = JSON.stringify(normalized);
  return createHash('sha256').update(json).digest('hex');
}

/**
 * Ordena recursivamente as chaves de um objeto e os valores de array (strings).
 * Retorna um novo objeto sem mutações.
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};

  for (const key of Object.keys(obj).sort()) {
    const value = obj[key];

    if (Array.isArray(value)) {
      // Arrays de strings são ordenados para garantir determinismo
      sorted[key] = [...value].sort();
    } else if (value !== null && typeof value === 'object') {
      sorted[key] = sortObjectKeys(value as Record<string, unknown>);
    } else {
      sorted[key] = value;
    }
  }

  return sorted;
}
