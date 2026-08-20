/**
 * Testes de integração contra a API real do DataJud.
 *
 * Estes testes requerem a variável DATAJUD_API_KEY configurada
 * e acesso à internet. São ignorados se a variável não estiver presente.
 *
 * Para executar manualmente:
 *   DATAJUD_API_KEY=sua-chave pnpm test src/lib/datajud/__tests__/client.integration.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { queryTribunal } from '../client';
import { DataJudUnavailableError } from '../types';

// Regex do formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO (20 dígitos sem pontuação ou com)
const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

const hasApiKey = Boolean(process.env.DATAJUD_API_KEY);

describe.skipIf(!hasApiKey)('queryTribunal — integração real DataJud', () => {
  beforeAll(() => {
    if (!hasApiKey) {
      console.warn(
        'AVISO: DATAJUD_API_KEY não configurada — testes de integração ignorados.',
      );
    }
  });

  it('queryTribunal("api_publica_tjsp", { grau: ["G1"] }, 0, 5) retorna ProcessoResult com numero no formato CNJ', async () => {
    const result = await queryTribunal('api_publica_tjsp', { grau: ['G1'] }, 0, 5);

    expect(result.hits.length).toBeGreaterThan(0);
    for (const processo of result.hits) {
      expect(processo.numero).toMatch(CNJ_REGEX);
      expect(processo.tribunal).toBeTruthy();
      expect(processo.grau).toBeTruthy();
    }
  }, 30_000);

  it('queryTribunal com tribunal inválido lança DataJudUnavailableError após retries', async () => {
    await expect(
      queryTribunal('api_publica_INVALIDO', { grau: ['G1'] }, 0, 1),
    ).rejects.toThrow(DataJudUnavailableError);
  }, 30_000);
});

// Teste que sempre roda para garantir que o módulo exporta corretamente
describe('queryTribunal — sanidade de módulo', () => {
  it('exporta função queryTribunal', () => {
    expect(typeof queryTribunal).toBe('function');
  });
});
