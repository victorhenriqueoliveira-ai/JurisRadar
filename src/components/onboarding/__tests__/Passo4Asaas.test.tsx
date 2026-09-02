// @vitest-environment jsdom
/**
 * Testes unitários do componente Passo4Asaas.
 *
 * Valida:
 * - POST /api/asaas/connect é chamado na montagem
 * - Polling começa após criação da sub-conta
 * - Quando polling retorna status = 'active', exibe mensagem de sucesso
 * - Após 30s sem ativação, exibe opção de continuar sem Asaas
 * - Botão "Pular" aparece após 5s
 *
 * Nota: usa props _pollingIntervalMs e _skipDelayMs para controlar tempos em teste.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Passo4Asaas } from '../Passo4Asaas';

// fetch global mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

/** Props padrão para testes: polling a cada 50ms, botão Pular após 100ms */
const FAST_PROPS = { _pollingIntervalMs: 50, _skipDelayMs: 100 };

describe('Passo4Asaas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama POST /api/asaas/connect na montagem da etapa', async () => {
    // Connect retorna 201 pending, polling não resolve durante o teste
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ status: 'pending' }) };
      }
      return { ok: true, json: async () => ({ status: 'pending' }) };
    });

    render(<Passo4Asaas onProximo={vi.fn()} onPular={vi.fn()} {...FAST_PROPS} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/asaas/connect',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('exibe "Criando sua conta de recebimento..." durante polling', async () => {
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ status: 'pending' }) };
      }
      return { ok: true, json: async () => ({ status: 'pending' }) };
    });

    render(<Passo4Asaas onProximo={vi.fn()} onPular={vi.fn()} {...FAST_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText(/criando sua conta de recebimento/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem de sucesso quando polling retorna status = active', async () => {
    let pollingChamadas = 0;
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ status: 'pending' }) };
      }
      pollingChamadas += 1;
      return {
        ok: true,
        json: async () => ({ status: pollingChamadas >= 1 ? 'active' : 'pending' }),
      };
    });

    render(<Passo4Asaas onProximo={vi.fn()} onPular={vi.fn()} {...FAST_PROPS} />);

    // Com polling a cada 50ms, deve ativar rapidamente
    await waitFor(
      () => {
        expect(screen.getByText(/conta de recebimento ativada com sucesso/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('após 30s sem ativação (15 iterações), exibe mensagem informativa de KYC', async () => {
    // POST retorna pending, GET sempre retorna pending
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ status: 'pending' }) };
      }
      return { ok: true, json: async () => ({ status: 'pending' }) };
    });

    // Com polling a cada 50ms, 15 iterações = 750ms máximo
    render(<Passo4Asaas onProximo={vi.fn()} onPular={vi.fn()} {...FAST_PROPS} />);

    await waitFor(
      () => {
        expect(screen.getByText(/conta em análise/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it('exibe botão "Pular por enquanto" após o delay configurado', async () => {
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ status: 'pending' }) };
      }
      return { ok: true, json: async () => ({ status: 'pending' }) };
    });

    render(<Passo4Asaas onProximo={vi.fn()} onPular={vi.fn()} {...FAST_PROPS} />);

    // Com _skipDelayMs=100, botão deve aparecer rapidamente
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /pular por enquanto/i })).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('quando há sub-conta existente (409), inicia polling sem re-criar', async () => {
    let postChamadas = 0;
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        postChamadas += 1;
        return {
          ok: false,
          status: 409,
          json: async () => ({ asaasAccountId: 'acc-existente', status: 'pending' }),
        };
      }
      return { ok: true, json: async () => ({ status: 'active' }) };
    });

    render(<Passo4Asaas onProximo={vi.fn()} onPular={vi.fn()} {...FAST_PROPS} />);

    // Aguarda polling ativar com resposta 'active'
    await waitFor(
      () => {
        expect(screen.getByText(/conta de recebimento ativada com sucesso/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // POST foi chamado apenas 1x
    expect(postChamadas).toBe(1);
  });
});
