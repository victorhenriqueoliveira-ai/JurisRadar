/**
 * Testes unitários para src/db/index.ts
 *
 * Valida o comportamento de inicialização do cliente Drizzle:
 * - Exporta instância db válida quando DATABASE_URL está definida
 * - Lança erro descritivo quando DATABASE_URL está ausente
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('src/db/index.ts — inicialização do cliente', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Isola variáveis de ambiente entre testes
    process.env = { ...ORIGINAL_ENV };
    // Limpa o cache de módulo para forçar re-importação
    vi.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.resetModules();
  });

  it('deve exportar instância db não-nula quando DATABASE_URL é válida', async () => {
    process.env.DATABASE_URL =
      'postgresql://user:pass@ep-test.neon.tech/dbname?sslmode=require';

    const mod = await import('../index');
    expect(mod.db).toBeDefined();
    expect(mod.db).not.toBeNull();
  });

  it('deve lançar erro descritivo quando DATABASE_URL está ausente', async () => {
    delete process.env.DATABASE_URL;

    await expect(import('../index')).rejects.toThrow(
      /DATABASE_URL/,
    );
  });

  it('deve lançar erro com mensagem orientando o desenvolvedor', async () => {
    delete process.env.DATABASE_URL;

    await expect(import('../index')).rejects.toThrow(
      /\.env\.example/,
    );
  });
});
