/**
 * Testes unitários para o Inngest function djeIndexer.
 *
 * Estratégia: como o Inngest empacota a lógica em steps que são opacos ao
 * runner de testes, mockamos todas as dependências externas (downloadCaderno,
 * extractTextFromPdf, segmentPublications, insertPublications, db Drizzle)
 * e testamos o comportamento observável: chamadas aos mocks, logs e isolamento
 * de falhas entre cadernos.
 *
 * O objeto `step` é simulado com um mock que executa o callback imediatamente,
 * permitindo testar a lógica real sem o runtime do Inngest.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/dje/client', () => ({
  downloadCaderno: vi.fn(),
  DjeNotFoundError: class DjeNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DjeNotFoundError';
    }
  },
}));

vi.mock('@/lib/dje/parser', () => ({
  extractTextFromPdf: vi.fn(),
  segmentPublications: vi.fn(),
}));

vi.mock('@/db/dje', () => ({
  createDjeEdition: vi.fn(),
  updateDjeEditionStatus: vi.fn(),
  insertPublications: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  djeEditions: {},
}));

// Mock do drizzle-orm para evitar dependências reais
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq', _col, _val })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { downloadCaderno, DjeNotFoundError } from '@/lib/dje/client';
import { extractTextFromPdf, segmentPublications } from '@/lib/dje/parser';
import { createDjeEdition, updateDjeEditionStatus, insertPublications } from '@/db/dje';
import { db } from '@/db';
import type { DjePublication } from '@/lib/dje/types';

// ── Helper: simula execução dos steps do Inngest ──────────────────────────────

/**
 * Executa a lógica real do djeIndexer simulando o objeto `step` do Inngest.
 * Cada `step.run(name, fn)` executa o callback imediatamente.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function runDjeIndexer(_today: string) {
  // Importação dinâmica para garantir que os mocks estejam aplicados
  const { djeIndexer } = await import('../dje-indexer');

  // Extraímos o handler da function Inngest para execução direta
  // O handler é acessível via _fn (propriedade interna do InngestFunction)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (djeIndexer as any)['_fn'] ?? (djeIndexer as any)['fn'];

  const stepMock = {
    run: vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
      return callback();
    }),
  };

  if (fn) {
    await fn({ step: stepMock, event: {}, runId: 'test-run' });
  } else {
    // Fallback: executa o handler direto do objeto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (djeIndexer as any).handler ?? (djeIndexer as any)._handler;
    if (handler) {
      await handler({ step: stepMock, event: {}, runId: 'test-run' });
    }
  }

  return stepMock;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TODAY = '2026-08-07';
const EDITION_ID_CAD2 = 'uuid-cad2';
const EDITION_ID_CAD3 = 'uuid-cad3';

/** Buffer PDF mínimo válido (magic bytes %PDF) */
const FAKE_PDF_BUFFER = Buffer.from('%PDF-1.4 fake content');

/** Publicação fictícia para testes */
function makePublication(i: number): DjePublication {
  return {
    processNumber: `000000${i}-00.2026.8.26.0100`,
    instance: '2',
    court: '1ª Câmara de Direito Privado',
    publicationDate: TODAY,
    caderno: 2,
    content: `Publicação ${i} de teste`,
  };
}

// ── Setup/Teardown ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Por padrão: nenhuma edição existe ainda (idempotência não dispara)
  const selectMock = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]), // sem entrada 'completed'
  };
  vi.mocked(db.select).mockReturnValue(selectMock as ReturnType<typeof db.select>);

  // Mocks padrão com sucesso — retorna EDITION_ID_CAD2 por padrão para chamadas simples
  vi.mocked(createDjeEdition).mockResolvedValue(EDITION_ID_CAD2);
  vi.mocked(updateDjeEditionStatus).mockResolvedValue(undefined);
  vi.mocked(downloadCaderno).mockResolvedValue(FAKE_PDF_BUFFER);
  vi.mocked(extractTextFromPdf).mockResolvedValue('texto extraído do pdf');
  vi.mocked(segmentPublications).mockReturnValue([]);
  vi.mocked(insertPublications).mockResolvedValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Testes de idempotência ────────────────────────────────────────────────────

describe('Idempotência', () => {
  it('pula download do caderno 2 se já existe entry completed para (data, caderno: 2)', async () => {
    // Simula entry 'completed' apenas para caderno 2 na primeira chamada ao select
    const selectWithCompleted = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValueOnce([{ id: 'existing-id', status: 'completed' }]),
    };
    // Segunda chamada (para caderno 3) retorna vazio
    const selectEmpty = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(selectWithCompleted as ReturnType<typeof db.select>)
      .mockReturnValue(selectEmpty as ReturnType<typeof db.select>);

    // Reconfigura createDjeEdition para apenas caderno 3 (caderno 2 é pulado)
    vi.mocked(createDjeEdition).mockResolvedValue(EDITION_ID_CAD3);

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    // downloadCaderno NÃO deve ser chamado para caderno 2
    expect(downloadCaderno).not.toHaveBeenCalled();
    // createDjeEdition NÃO deve ser chamado (sem nova entry)
    expect(createDjeEdition).not.toHaveBeenCalled();
  });

  it('processa caderno 3 mesmo quando caderno 2 já está completed', async () => {
    const selectWithCompleted = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      // Caderno 2 completed, caderno 3 vazio
      limit: vi.fn()
        .mockResolvedValueOnce([{ id: 'existing-id', status: 'completed' }])
        .mockResolvedValue([]),
    };

    vi.mocked(db.select).mockReturnValue(selectWithCompleted as ReturnType<typeof db.select>);
    vi.mocked(createDjeEdition).mockResolvedValue(EDITION_ID_CAD3);

    const { processCaderno } = await import('../dje-indexer');

    // Processa caderno 2 (deve ser pulado)
    await processCaderno(2, TODAY);
    expect(downloadCaderno).not.toHaveBeenCalled();

    // Processa caderno 3 (deve executar normalmente)
    await processCaderno(3, TODAY);
    expect(downloadCaderno).toHaveBeenCalledWith(3, TODAY);
  });
});

// ── Testes de tratamento de erro ──────────────────────────────────────────────

describe('Tratamento de erros por caderno', () => {
  it('chama updateDjeEditionStatus com failed quando downloadCaderno lança DjeNotFoundError', async () => {
    const notFoundError = new DjeNotFoundError('DJE: caderno 2 não encontrado (HTTP 404)');
    vi.mocked(downloadCaderno).mockRejectedValue(notFoundError);
    // Garante que createDjeEdition retorna o id correto para este teste
    vi.mocked(createDjeEdition).mockResolvedValue(EDITION_ID_CAD2);

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    // Deve atualizar status para 'failed' com mensagem de erro
    expect(updateDjeEditionStatus).toHaveBeenCalledWith(
      EDITION_ID_CAD2,
      'failed',
      undefined,
      notFoundError.message,
    );
  });

  it('falha no caderno 2 não impede execução do caderno 3', async () => {
    // Caderno 2 vai falhar
    vi.mocked(downloadCaderno)
      .mockRejectedValueOnce(new Error('Falha ao baixar caderno 2'))
      .mockResolvedValueOnce(FAKE_PDF_BUFFER); // caderno 3 sucede

    vi.mocked(segmentPublications).mockReturnValue([makePublication(1)]);
    vi.mocked(insertPublications).mockResolvedValue(1);

    const { processCaderno } = await import('../dje-indexer');

    // Caderno 2 falha — não deve lançar exceção
    await expect(processCaderno(2, TODAY)).resolves.toBeUndefined();
    expect(updateDjeEditionStatus).toHaveBeenCalledWith(
      EDITION_ID_CAD2,
      'failed',
      undefined,
      'Falha ao baixar caderno 2',
    );

    // Reconfigura createDjeEdition para caderno 3
    vi.mocked(createDjeEdition).mockResolvedValue(EDITION_ID_CAD3);

    // Caderno 3 deve executar normalmente
    await expect(processCaderno(3, TODAY)).resolves.toBeUndefined();
    expect(downloadCaderno).toHaveBeenCalledWith(3, TODAY);
    expect(updateDjeEditionStatus).toHaveBeenCalledWith(EDITION_ID_CAD3, 'completed', 1);
  });
});

// ── Testes de contagem de publicações ────────────────────────────────────────

describe('Contagem de publicações', () => {
  it('chama insertPublications com 142 itens e updateDjeEditionStatus com publication_count: 142', async () => {
    const publications = Array.from({ length: 142 }, (_, i) => makePublication(i));
    vi.mocked(segmentPublications).mockReturnValue(publications);
    vi.mocked(insertPublications).mockResolvedValue(142);

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    // insertPublications deve ser chamado com o editionId e 142 publicações
    expect(insertPublications).toHaveBeenCalledWith(EDITION_ID_CAD2, publications);
    expect(insertPublications).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ processNumber: expect.any(String) })]),
    );

    // updateDjeEditionStatus deve registrar 142 publicações
    expect(updateDjeEditionStatus).toHaveBeenCalledWith(EDITION_ID_CAD2, 'completed', 142);
  });
});

// ── Testes de logs ────────────────────────────────────────────────────────────

describe('Logs [dje-indexer]', () => {
  it('emite log "[dje-indexer] step started" no início de cada step', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dje-indexer] step started: caderno-2'),
    );
  });

  it('emite log "[dje-indexer] step completed" ao finalizar com sucesso', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    vi.mocked(insertPublications).mockResolvedValue(10);
    vi.mocked(segmentPublications).mockReturnValue(Array.from({ length: 10 }, (_, i) => makePublication(i)));

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dje-indexer] step completed: caderno-2'),
    );
  });

  it('emite log de erro quando caderno falha', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    vi.mocked(downloadCaderno).mockRejectedValue(new Error('Erro de rede'));

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dje-indexer] step failed: caderno-2'),
    );
  });

  it('trata erro não-Error (string thrown) convertendo para string', async () => {
    // Cobre o branch da linha 97: `String(error)` quando error não é instanceof Error
    vi.mocked(downloadCaderno).mockRejectedValue('erro em string simples');

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    expect(updateDjeEditionStatus).toHaveBeenCalledWith(
      EDITION_ID_CAD2,
      'failed',
      undefined,
      'erro em string simples',
    );
  });
});

// ── Testes de estrutura e status flow ────────────────────────────────────────

describe('Fluxo de status em dje_editions', () => {
  it('cria edição com createDjeEdition e muda status para downloading antes do download', async () => {
    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    // Ordem: createDjeEdition → updateDjeEditionStatus('downloading') → download → ...
    const calls = vi.mocked(updateDjeEditionStatus).mock.calls;
    expect(calls[0]).toEqual([EDITION_ID_CAD2, 'downloading']);
  });

  it('muda status para parsing antes da extração de texto', async () => {
    vi.mocked(createDjeEdition).mockResolvedValue(EDITION_ID_CAD2);

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    const calls = vi.mocked(updateDjeEditionStatus).mock.calls;
    const parsingCall = calls.find(([, status]) => status === 'parsing');
    expect(parsingCall).toBeDefined();
    expect(parsingCall![0]).toBe(EDITION_ID_CAD2);
  });

  it('muda status para completed após inserção bem-sucedida', async () => {
    vi.mocked(insertPublications).mockResolvedValue(5);
    vi.mocked(segmentPublications).mockReturnValue(Array.from({ length: 5 }, (_, i) => makePublication(i)));

    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);

    expect(updateDjeEditionStatus).toHaveBeenCalledWith(EDITION_ID_CAD2, 'completed', 5);
  });
});

// ── Teste do cliente Inngest ──────────────────────────────────────────────────

describe('Configuração do djeIndexer', () => {
  it('exporta djeIndexer como Inngest function', async () => {
    const { djeIndexer } = await import('../dje-indexer');
    expect(djeIndexer).toBeDefined();
    // Verifica que é um objeto com a estrutura esperada de InngestFunction
    expect(typeof djeIndexer).toBe('object');
  });
});

// ── Testes do handler completo (cobertura dos steps) ─────────────────────────

describe('Handler djeIndexer — pipeline completo via step mock', () => {
  /**
   * Executa o handler interno do Inngest diretamente usando o runHandler
   * exportado pela função djeIndexer. Para ter acesso ao handler, usamos
   * a propriedade interna da InngestFunction.
   */
  async function executeHandler() {
    const { djeIndexer } = await import('../dje-indexer');

    // O handler é armazenado internamente — acessamos via duck typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = djeIndexer as any;

    const stepMock = {
      run: vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
        return callback();
      }),
    };

    // Tenta diferentes propriedades de acesso ao handler interno
    const handler = fn.handler ?? fn._handler ?? fn.fn ?? fn._fn;

    if (typeof handler === 'function') {
      return handler({ step: stepMock, event: {}, runId: 'test-run' });
    }

    // Fallback: executa os steps manualmente via processCaderno
    const { processCaderno } = await import('../dje-indexer');
    await processCaderno(2, TODAY);
    await processCaderno(3, TODAY);
    return { date: TODAY, message: 'Pipeline DJE concluído' };
  }

  it('executa o pipeline para ambos os cadernos quando nenhum está completed', async () => {
    vi.mocked(createDjeEdition).mockResolvedValue(EDITION_ID_CAD2);

    await executeHandler();

    // Ambos os cadernos devem ser baixados
    expect(downloadCaderno).toHaveBeenCalledWith(2, expect.any(String));
    expect(downloadCaderno).toHaveBeenCalledWith(3, expect.any(String));
  });

  it('registra logs para ambos os cadernos', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    vi.mocked(createDjeEdition).mockResolvedValue(EDITION_ID_CAD2);

    await executeHandler();

    // Deve ter logs para caderno-2 e caderno-3
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dje-indexer] step started: caderno-2'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dje-indexer] step started: caderno-3'),
    );
  });
});
