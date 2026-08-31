/**
 * Validação de MIME type e tamanho de arquivos para upload.
 *
 * Limites definidos no ADR-005:
 *   - Tamanho máximo por arquivo: 10 MB
 *   - MIME types permitidos: PDF, JPEG, PNG, DOC, DOCX
 */

/** Limite máximo por arquivo em bytes (10 MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** MIME types aceitos para upload de anexos */
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export type StorageValidationError =
  | 'FILE_TOO_LARGE'
  | 'INVALID_MIME_TYPE'
  | 'QUOTA_EXCEEDED';

export class StorageError extends Error {
  constructor(
    public readonly code: StorageValidationError,
    message: string,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Valida o MIME type do arquivo.
 * Lança `StorageError` com código `INVALID_MIME_TYPE` se não permitido.
 */
export function validateMimeType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new StorageError(
      'INVALID_MIME_TYPE',
      `Tipo de arquivo não permitido: ${mimeType}. Tipos aceitos: PDF, JPEG, PNG, DOC, DOCX.`,
    );
  }
}

/**
 * Valida o tamanho do arquivo.
 * Lança `StorageError` com código `FILE_TOO_LARGE` se exceder 10 MB.
 */
export function validateFileSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    throw new StorageError(
      'FILE_TOO_LARGE',
      `Arquivo muito grande: ${sizeMB} MB. O limite por arquivo é 10 MB.`,
    );
  }
}

/**
 * Executa todas as validações de arquivo (MIME + tamanho).
 * Lança `StorageError` na primeira violação encontrada.
 */
export function validateFile(file: { type: string; size: number }): void {
  validateMimeType(file.type);
  validateFileSize(file.size);
}
