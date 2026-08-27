/**
 * Adaptador StorageClient utilizando Vercel Blob.
 *
 * Implementa a interface `StorageClient` definida no TechSpec (seção "Core Interfaces"):
 *   - upload: valida MIME, tamanho e quota; depois faz put() no Vercel Blob
 *   - delete: executa del() no Vercel Blob para remover o objeto
 *
 * Pathname gerado: org-{orgId}/processos/{processoId}/{uuid}-{nome}
 */

import { put, del } from '@vercel/blob';
import { validateFile } from './validation';
import { checkQuota } from './quota';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface UploadInput {
  arquivo: File;
  orgId: string;
  processoId: string;
  uploadedBy: string;
}

export interface StorageResult {
  url: string;
  tamanho: number;
  mimeType: string;
}

export interface StorageClient {
  upload(input: UploadInput): Promise<StorageResult>;
  delete(url: string): Promise<void>;
}

// ── Implementação ─────────────────────────────────────────────────────────────

/**
 * Gera o pathname estruturado para o Blob:
 * `org-{orgId}/processos/{processoId}/{nome-do-arquivo}`
 */
function buildPathname(orgId: string, processoId: string, nomeArquivo: string): string {
  // Sanitiza o nome do arquivo removendo caracteres problemáticos
  const nomeSanitizado = nomeArquivo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');

  return `org-${orgId}/processos/${processoId}/${nomeSanitizado}`;
}

/**
 * Implementação concreta do StorageClient usando Vercel Blob.
 */
export const storageClient: StorageClient = {
  /**
   * Faz upload de um arquivo para o Vercel Blob após validações de:
   *   1. MIME type permitido
   *   2. Tamanho máximo (10 MB)
   *   3. Quota do escritório (500 MB)
   *
   * Retorna `{ url, tamanho, mimeType }` em caso de sucesso.
   * Lança `StorageError` em caso de violação de regra.
   */
  async upload(input: UploadInput): Promise<StorageResult> {
    const { arquivo, orgId, processoId } = input;

    // 1. Valida MIME type e tamanho antes de qualquer I/O
    validateFile({ type: arquivo.type, size: arquivo.size });

    // 2. Verifica quota do escritório
    await checkQuota(orgId, arquivo.size);

    // 3. Faz upload no Vercel Blob
    const pathname = buildPathname(orgId, processoId, arquivo.name);
    const blob = await put(pathname, arquivo, {
      access: 'public',
      addRandomSuffix: true,
      contentType: arquivo.type,
    });

    return {
      url: blob.url,
      tamanho: arquivo.size,
      mimeType: arquivo.type,
    };
  },

  /**
   * Remove um blob do Vercel Blob pela URL.
   * Não lança exceção se a URL for inválida — falha silenciosa é esperada
   * para garantir idempotência na exclusão.
   */
  async delete(url: string): Promise<void> {
    try {
      await del(url);
    } catch (err) {
      // Log do erro sem relançar — evita quebra de fluxo em URLs já removidas
      console.error('[StorageClient] Falha ao remover blob:', url, err);
    }
  },
};
