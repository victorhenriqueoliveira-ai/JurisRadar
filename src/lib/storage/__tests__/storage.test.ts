/**
 * Testes unitários — StorageClient (Vercel Blob)
 *
 * Cobre:
 *   - upload com arquivo válido (PDF 5 MB) → chama put() e retorna metadados
 *   - upload com arquivo > 10 MB → rejeita com FILE_TOO_LARGE antes de chamar put()
 *   - upload com MIME type inválido → rejeita com INVALID_MIME_TYPE
 *   - upload quando quota excedida (490 MB + 15 MB > 500 MB) → rejeita com QUOTA_EXCEEDED
 *   - delete → chama del() com a URL correta
 *   - delete com URL inválida → não lança exceção não tratada
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    execute: vi.fn(),
  },
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { put, del } from '@vercel/blob';
import { db } from '@/db';
import { storageClient } from '../blob';
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  StorageError,
  validateFile,
  validateMimeType,
  validateFileSize,
} from '../validation';
import { getUsedQuotaBytes, checkQuota, MAX_QUOTA_BYTES } from '../quota';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MB = 1024 * 1024;

function createFakeFile(name: string, mimeType: string, sizeBytes: number): File {
  const blob = new Blob([new ArrayBuffer(sizeBytes)], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

function mockDbQuota(usedBytes: number) {
  vi.mocked(db.execute).mockResolvedValueOnce({
    rows: [{ total: String(usedBytes) }],
  } as never);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Validation — validateMimeType', () => {
  it('deve aceitar PDF', () => {
    expect(() => validateMimeType('application/pdf')).not.toThrow();
  });

  it('deve aceitar image/jpeg', () => {
    expect(() => validateMimeType('image/jpeg')).not.toThrow();
  });

  it('deve aceitar image/png', () => {
    expect(() => validateMimeType('image/png')).not.toThrow();
  });

  it('deve aceitar application/msword', () => {
    expect(() => validateMimeType('application/msword')).not.toThrow();
  });

  it('deve aceitar application/vnd.openxmlformats-officedocument.wordprocessingml.document', () => {
    expect(() =>
      validateMimeType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).not.toThrow();
  });

  it('deve rejeitar text/html com INVALID_MIME_TYPE', () => {
    const err = (() => {
      try {
        validateMimeType('text/html');
      } catch (e) {
        return e;
      }
    })() as StorageError;

    expect(err).toBeInstanceOf(StorageError);
    expect(err.code).toBe('INVALID_MIME_TYPE');
  });

  it('deve rejeitar text/plain com INVALID_MIME_TYPE', () => {
    expect(() => validateMimeType('text/plain')).toThrowError(StorageError);
  });
});

describe('Validation — validateFileSize', () => {
  it('deve aceitar arquivo de exatamente 10 MB', () => {
    expect(() => validateFileSize(10 * MB)).not.toThrow();
  });

  it('deve aceitar arquivo de 5 MB', () => {
    expect(() => validateFileSize(5 * MB)).not.toThrow();
  });

  it('deve rejeitar arquivo de 11 MB com FILE_TOO_LARGE', () => {
    const err = (() => {
      try {
        validateFileSize(11 * MB);
      } catch (e) {
        return e;
      }
    })() as StorageError;

    expect(err).toBeInstanceOf(StorageError);
    expect(err.code).toBe('FILE_TOO_LARGE');
  });

  it('deve rejeitar arquivo de 10 MB + 1 byte', () => {
    expect(() => validateFileSize(10 * MB + 1)).toThrowError(StorageError);
  });
});

describe('Quota — getUsedQuotaBytes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deve retornar 0 quando não há registros', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [] } as never);
    const result = await getUsedQuotaBytes('org-1');
    expect(result).toBe(0);
  });

  it('deve retornar o total em bytes', async () => {
    mockDbQuota(200 * MB);
    const result = await getUsedQuotaBytes('org-1');
    expect(result).toBe(200 * MB);
  });
});

describe('Quota — checkQuota', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deve permitir upload quando quota disponível', async () => {
    mockDbQuota(100 * MB);
    await expect(checkQuota('org-1', 50 * MB)).resolves.toBeUndefined();
  });

  it('deve rejeitar com QUOTA_EXCEEDED quando soma excede 500 MB', async () => {
    // 490 MB usados + 15 MB novo > 500 MB
    mockDbQuota(490 * MB);
    const err = await checkQuota('org-1', 15 * MB).catch((e) => e) as StorageError;
    expect(err).toBeInstanceOf(StorageError);
    expect(err.code).toBe('QUOTA_EXCEEDED');
  });

  it('deve permitir upload que usa exatamente a quota restante', async () => {
    mockDbQuota(490 * MB);
    await expect(checkQuota('org-1', 10 * MB)).resolves.toBeUndefined();
  });
});

describe('StorageClient — upload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deve chamar put() e retornar { url, tamanho, mimeType } para PDF de 5 MB válido', async () => {
    const fakeUrl = 'https://blob.vercel-storage.com/org-123/processos/p-456/contrato.pdf';
    vi.mocked(put).mockResolvedValueOnce({ url: fakeUrl } as never);
    mockDbQuota(0); // quota zerada

    const arquivo = createFakeFile('contrato.pdf', 'application/pdf', 5 * MB);
    const result = await storageClient.upload({
      arquivo,
      orgId: 'org-123',
      processoId: 'p-456',
      uploadedBy: 'user-789',
    });

    expect(put).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledWith(
      expect.stringContaining('org-org-123/processos/p-456/'),
      arquivo,
      expect.objectContaining({ access: 'public', addRandomSuffix: true }),
    );
    expect(result).toEqual({
      url: fakeUrl,
      tamanho: 5 * MB,
      mimeType: 'application/pdf',
    });
  });

  it('deve rejeitar arquivo de 11 MB com FILE_TOO_LARGE antes de chamar put()', async () => {
    const arquivo = createFakeFile('enorme.pdf', 'application/pdf', 11 * MB);

    await expect(
      storageClient.upload({
        arquivo,
        orgId: 'org-123',
        processoId: 'p-456',
        uploadedBy: 'user-789',
      }),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });

    expect(put).not.toHaveBeenCalled();
    expect(db.execute).not.toHaveBeenCalled(); // nem checa quota
  });

  it('deve rejeitar MIME type text/html com INVALID_MIME_TYPE', async () => {
    const arquivo = createFakeFile('pagina.html', 'text/html', 1 * MB);

    await expect(
      storageClient.upload({
        arquivo,
        orgId: 'org-123',
        processoId: 'p-456',
        uploadedBy: 'user-789',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_MIME_TYPE' });

    expect(put).not.toHaveBeenCalled();
  });

  it('deve rejeitar com QUOTA_EXCEEDED quando escritório está com 495 MB e arquivo tem 8 MB (total > 500 MB)', async () => {
    // 495 MB usados + 8 MB novo = 503 MB > 500 MB limite
    // Nota: usamos 8 MB para ficar abaixo do limite por arquivo (10 MB)
    // e ainda assim ultrapassar a quota do escritório (500 MB)
    mockDbQuota(495 * MB); // já usou 495 MB
    const arquivo = createFakeFile('grande.pdf', 'application/pdf', 8 * MB);

    await expect(
      storageClient.upload({
        arquivo,
        orgId: 'org-123',
        processoId: 'p-456',
        uploadedBy: 'user-789',
      }),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });

    expect(put).not.toHaveBeenCalled();
  });
});

describe('StorageClient — delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deve chamar del() com a URL correta', async () => {
    vi.mocked(del).mockResolvedValueOnce(undefined);
    const url = 'https://blob.vercel-storage.com/org-123/processos/p-456/doc.pdf';

    await storageClient.delete(url);

    expect(del).toHaveBeenCalledOnce();
    expect(del).toHaveBeenCalledWith(url);
  });

  it('não deve lançar exceção não tratada para URL inválida', async () => {
    vi.mocked(del).mockRejectedValueOnce(new Error('URL inválida'));

    await expect(storageClient.delete('https://url-invalida.com/nao-existe')).resolves.toBeUndefined();
  });

  it('não deve lançar exceção quando del() lança erro inesperado', async () => {
    vi.mocked(del).mockRejectedValueOnce(new Error('Blob not found'));

    await expect(storageClient.delete('https://blob.vercel-storage.com/nao-existe')).resolves.toBeUndefined();
  });
});

describe('StorageError', () => {
  it('deve ter propriedades code e message corretamente definidas', () => {
    const err = new StorageError('FILE_TOO_LARGE', 'Arquivo muito grande');
    expect(err.code).toBe('FILE_TOO_LARGE');
    expect(err.message).toBe('Arquivo muito grande');
    expect(err.name).toBe('StorageError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('Constants', () => {
  it('MAX_FILE_SIZE_BYTES deve ser 10 MB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });

  it('MAX_QUOTA_BYTES deve ser 500 MB', () => {
    expect(MAX_QUOTA_BYTES).toBe(500 * 1024 * 1024);
  });

  it('ALLOWED_MIME_TYPES deve conter os 5 tipos permitidos', () => {
    expect(ALLOWED_MIME_TYPES.size).toBe(5);
    expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true);
    expect(ALLOWED_MIME_TYPES.has('image/jpeg')).toBe(true);
    expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true);
    expect(ALLOWED_MIME_TYPES.has('application/msword')).toBe(true);
    expect(ALLOWED_MIME_TYPES.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
  });
});
