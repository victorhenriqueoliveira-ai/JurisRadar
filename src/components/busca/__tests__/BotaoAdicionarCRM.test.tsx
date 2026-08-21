/**
 * Testes de componente — BotaoAdicionarCRM
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BotaoAdicionarCRM from '../BotaoAdicionarCRM';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('BotaoAdicionarCRM', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe "Verificando..." enquanto consulta a API', async () => {
    // fetch nunca resolve — mantém estado de verificando
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    render(<BotaoAdicionarCRM numeroCnj="0001234-56.2023.8.26.0001" tribunal="TJSP" />);

    expect(screen.getByTestId('btn-crm-verificando')).toBeInTheDocument();
    expect(screen.getByText('Verificando...')).toBeInTheDocument();
  });

  it('exibe "(já monitorado)" quando processo já está no CRM', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ processos: [{ id: 'p-1' }], total: 1 }),
    } as Response);

    render(<BotaoAdicionarCRM numeroCnj="0001234-56.2023.8.26.0001" />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-crm-monitorado')).toBeInTheDocument();
    });
    expect(screen.getByText('✓ Já monitorado')).toBeInTheDocument();
  });

  it('exibe botão "+ Adicionar ao CRM" quando processo não está monitorado', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ processos: [], total: 0 }),
    } as Response);

    render(<BotaoAdicionarCRM numeroCnj="0001234-56.2023.8.26.0001" />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-adicionar-crm')).toBeInTheDocument();
    });
    expect(screen.getByText('+ Adicionar ao CRM')).toBeInTheDocument();
  });

  it('chama POST /api/processos e exibe "Adicionado ao CRM!" ao clicar no botão', async () => {
    // GET retorna vazio (não monitorado)
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ processos: [], total: 0 }),
      } as Response)
      // POST retorna sucesso
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Processo adicionado ao CRM', id: 'new-id' }),
      } as Response);

    const user = userEvent.setup();
    render(<BotaoAdicionarCRM numeroCnj="0001234-56.2023.8.26.0001" tribunal="TJSP" />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-adicionar-crm')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('btn-adicionar-crm'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-crm-adicionado')).toBeInTheDocument();
    });
    expect(screen.getByText('✓ Adicionado ao CRM!')).toBeInTheDocument();

    // Verifica que POST foi chamado com os dados corretos
    const calls = vi.mocked(fetch).mock.calls;
    const postCall = calls.find(([, opts]) => (opts as RequestInit)?.method === 'POST');
    expect(postCall).toBeTruthy();
    expect(JSON.parse((postCall?.[1] as RequestInit)?.body as string)).toEqual({
      numeroCnj: '0001234-56.2023.8.26.0001',
      tribunal: 'TJSP',
    });
  });

  it('exibe estado de erro quando POST falha', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ processos: [], total: 0 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Erro interno' }),
      } as Response);

    const user = userEvent.setup();
    render(<BotaoAdicionarCRM numeroCnj="0001234-56.2023.8.26.0001" />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-adicionar-crm')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('btn-adicionar-crm'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-crm-erro')).toBeInTheDocument();
    });
  });

  it('trata silenciosamente erro 401 do GET e exibe botão de adicionar', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Não autenticado' }),
    } as Response);

    render(<BotaoAdicionarCRM numeroCnj="0001234-56.2023.8.26.0001" />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-adicionar-crm')).toBeInTheDocument();
    });
  });
});
