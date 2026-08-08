import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DjeNotFoundError, DjeUnavailableError, downloadCaderno } from '../client';

// ── Mock global de fetch ──────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cria um Response simulando uma resposta HTTP bem-sucedida com PDF */
function mockPdfResponse(pdfBytes: Uint8Array = new Uint8Array([0x25, 0x50, 0x44, 0x46])): Response {
  return {
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(pdfBytes.buffer as ArrayBuffer),
    headers: new Headers({ 'Content-Type': 'application/octet-stream' }),
  } as unknown as Response;
}

/** Cria um Response com status de erro */
function mockErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
  } as unknown as Response;
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('downloadCaderno', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Construção de URL ───────────────────────────────────────────────────────

  it('monta URL com cdCaderno=11 para caderno 2', async () => {
    mockFetch.mockResolvedValueOnce(mockPdfResponse());

    await downloadCaderno(2, '2026-08-07');

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl: string = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('cdCaderno=11');
    expect(calledUrl).toContain('dtDiario=07%2F08%2F2026');
    expect(calledUrl).toContain('tpDownload=D');
  });

  it('monta URL com cdCaderno=12 para caderno 3', async () => {
    mockFetch.mockResolvedValueOnce(mockPdfResponse());

    await downloadCaderno(3, '2026-08-07');

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl: string = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('cdCaderno=12');
  });

  it('converte data YYYY-MM-DD para DD%2FMM%2FYYYY na URL', async () => {
    mockFetch.mockResolvedValueOnce(mockPdfResponse());

    await downloadCaderno(2, '2025-01-15');

    const calledUrl: string = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('dtDiario=15%2F01%2F2025');
  });

  // ── Sucesso ─────────────────────────────────────────────────────────────────

  it('retorna Buffer com magic bytes %PDF quando fetch retorna PDF válido', async () => {
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
    mockFetch.mockResolvedValueOnce(mockPdfResponse(pdfContent));

    const buffer = await downloadCaderno(2, '2026-08-07');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    // Verifica magic bytes %PDF (0x25 0x50 0x44 0x46)
    expect(buffer[0]).toBe(0x25); // %
    expect(buffer[1]).toBe(0x50); // P
    expect(buffer[2]).toBe(0x44); // D
    expect(buffer[3]).toBe(0x46); // F
  });

  // ── HTTP 404 — sem retry ────────────────────────────────────────────────────

  it('lança DjeNotFoundError imediatamente em HTTP 404 sem retry', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(404));

    await expect(downloadCaderno(2, '2026-08-07')).rejects.toThrow(DjeNotFoundError);
    // Apenas 1 tentativa — sem retry
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('mensagem do DjeNotFoundError inclui caderno e data', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(404));

    await expect(downloadCaderno(2, '2026-08-07')).rejects.toThrow(
      /caderno 2.*2026-08-07|2026-08-07.*caderno 2/,
    );
  });

  // ── HTTP 4xx != 404 — sem retry ────────────────────────────────────────────

  it('lança DjeUnavailableError imediatamente em HTTP 403 sem retry', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(403));

    await expect(downloadCaderno(2, '2026-08-07')).rejects.toThrow(DjeUnavailableError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('lança DjeUnavailableError imediatamente em HTTP 400 sem retry', async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(400));

    await expect(downloadCaderno(2, '2026-08-07')).rejects.toThrow(DjeUnavailableError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  // ── HTTP 5xx — 3 tentativas + DjeUnavailableError ──────────────────────────

  it('tenta 3 vezes em HTTP 503 e lança DjeUnavailableError após esgotamento', async () => {
    // Substituir sleep para não esperar delays reais
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockFetch.mockResolvedValue(mockErrorResponse(503));

    await expect(downloadCaderno(2, '2026-08-07')).rejects.toThrow(DjeUnavailableError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('tenta 3 vezes em HTTP 500 e lança DjeUnavailableError', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockFetch.mockResolvedValue(mockErrorResponse(500));

    await expect(downloadCaderno(2, '2026-08-07')).rejects.toThrow(DjeUnavailableError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  // ── TypeError de rede — 3 tentativas + DjeUnavailableError ─────────────────

  it('trata TypeError de rede como retryable e tenta 3 vezes', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(downloadCaderno(2, '2026-08-07')).rejects.toThrow(DjeUnavailableError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('erro final contém a mensagem da última falha de rede', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockFetch.mockRejectedValue(new TypeError('Network timeout'));

    await expect(downloadCaderno(2, '2026-08-07')).rejects.toThrow(/Network timeout/);
  });

  // ── Recuperação após falha ──────────────────────────────────────────────────

  it('retorna PDF se a segunda tentativa for bem-sucedida após falha em 5xx', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    mockFetch
      .mockResolvedValueOnce(mockErrorResponse(503))
      .mockResolvedValueOnce(mockPdfResponse(pdfContent));

    const buffer = await downloadCaderno(2, '2026-08-07');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer[0]).toBe(0x25); // %PDF
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
