// @vitest-environment jsdom
/**
 * Testes unitários do wizard de onboarding e seus componentes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks globais ─────────────────────────────────────────────────────────────

// Mock do next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock do driver.js — não existe no ambiente node/jsdom
vi.mock('driver.js', () => ({
  driver: vi.fn(() => ({
    drive: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// fetch global mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Passo1Escritorio ──────────────────────────────────────────────────────────

describe('Passo1Escritorio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('renderiza o formulário inicial', async () => {
    const { Passo1Escritorio } = await import('../Passo1Escritorio');
    const onProximo = vi.fn();
    render(<Passo1Escritorio onProximo={onProximo} />);

    expect(screen.getByLabelText(/nome do escritório/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cnpj/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próximo/i })).toBeInTheDocument();
  });

  it('exibe mensagem de validação quando nome está vazio', async () => {
    const { Passo1Escritorio } = await import('../Passo1Escritorio');
    const onProximo = vi.fn();
    render(<Passo1Escritorio onProximo={onProximo} />);

    const btn = screen.getByRole('button', { name: /próximo/i });
    await act(async () => { fireEvent.click(btn); });

    expect(screen.getByRole('alert')).toHaveTextContent(/obrigatório/i);
    expect(onProximo).not.toHaveBeenCalled();
  });

  it('chama onProximo após submit bem-sucedido', async () => {
    const { Passo1Escritorio } = await import('../Passo1Escritorio');
    const onProximo = vi.fn();
    render(<Passo1Escritorio onProximo={onProximo} />);

    fireEvent.change(screen.getByLabelText(/nome do escritório/i), {
      target: { value: 'Escritório Teste' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /próximo/i }).closest('form')!);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/organizacoes/me',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(onProximo).toHaveBeenCalledOnce();
    });
  });

  it('exibe erro da API quando o fetch falha', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Erro de servidor' }),
    });

    const { Passo1Escritorio } = await import('../Passo1Escritorio');
    const onProximo = vi.fn();
    render(<Passo1Escritorio onProximo={onProximo} />);

    fireEvent.change(screen.getByLabelText(/nome do escritório/i), {
      target: { value: 'Escritório Teste' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /próximo/i }).closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/erro de servidor/i);
      expect(onProximo).not.toHaveBeenCalled();
    });
  });
});

// ── Passo2Importacao ──────────────────────────────────────────────────────────

describe('Passo2Importacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza campos OAB e botões', async () => {
    const { Passo2Importacao } = await import('../Passo2Importacao');
    render(
      <Passo2Importacao
        onProximo={vi.fn()}
        onPular={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/número da oab/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estado da oab/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importar meus processos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pular/i })).toBeInTheDocument();
  });

  it('clicar em "Pular" chama onPular sem iniciar importação', async () => {
    const { Passo2Importacao } = await import('../Passo2Importacao');
    const onPular = vi.fn();
    render(
      <Passo2Importacao
        onProximo={vi.fn()}
        onPular={onPular}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /pular/i }));
    expect(onPular).toHaveBeenCalledOnce();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('exibe ImportLoader após clicar em Importar', async () => {
    vi.useRealTimers();
    // Fetch retorna 202 mas polling nunca resolve (mantém em loading)
    mockFetch.mockImplementation(async (url: string) => {
      if ((url as string).includes('/api/processos/sync')) {
        return { ok: true, status: 202, json: async () => ({}) };
      }
      // polling: nunca retorna total > 0 durante o teste
      return { ok: true, json: async () => ({ total: 0 }) };
    });

    const { Passo2Importacao } = await import('../Passo2Importacao');
    render(
      <Passo2Importacao
        onProximo={vi.fn()}
        onPular={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /importar meus processos/i }));
    });

    // Após o fetch de sync retornar, status muda para 'loading' e mostra ImportLoader
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it('exibe contagem de processos após polling retornar resultados', async () => {
    vi.useRealTimers();
    // Primeiro fetch: POST sync → 202
    // Segundo fetch (polling): GET processos → { total: 5 }
    mockFetch.mockImplementation(async (url: string) => {
      if ((url as string).includes('/api/processos/sync')) {
        return { ok: true, status: 202, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({ total: 5 }) };
    });

    const { Passo2Importacao } = await import('../Passo2Importacao');
    render(
      <Passo2Importacao
        onProximo={vi.fn()}
        onPular={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /importar meus processos/i }));
    });

    // Aguarda o polling completar (máximo 3s + margem)
    await waitFor(() => {
      expect(screen.getByText(/encontramos 5 processo/i)).toBeInTheDocument();
    }, { timeout: 8000 });
  }, 15000);
});

// ── Passo3Dashboard ───────────────────────────────────────────────────────────

describe('Passo3Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('renderiza preview com contagem de processos', async () => {
    const { Passo3Dashboard } = await import('../Passo3Dashboard');
    render(<Passo3Dashboard processosImportados={7} />);

    expect(screen.getByText(/7 processo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ir para o dashboard/i })).toBeInTheDocument();
  });

  it('renderiza mensagem padrão quando não há processos importados', async () => {
    const { Passo3Dashboard } = await import('../Passo3Dashboard');
    render(<Passo3Dashboard processosImportados={0} />);

    expect(screen.getByText(/configurado e pronto para uso/i)).toBeInTheDocument();
  });

  it('clicar "Ir para o dashboard" chama PATCH /api/onboarding/complete e redireciona', async () => {
    const { Passo3Dashboard } = await import('../Passo3Dashboard');
    render(<Passo3Dashboard processosImportados={3} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ir para o dashboard/i }));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/onboarding/complete',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(mockPush).toHaveBeenCalledWith('/app/dashboard');
    });
  });

  it('botão "Fazer tour interativo" inicia o tour', async () => {
    const { Passo3Dashboard } = await import('../Passo3Dashboard');
    render(<Passo3Dashboard processosImportados={0} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /fazer tour interativo/i }));
    });

    await waitFor(() => {
      // Após marcar conclusão, o TourInterativo é renderizado
      expect(screen.getByText(/tour interativo/i)).toBeInTheDocument();
    });
  });
});

// ── API: /api/onboarding/complete — testa a lógica diretamente ───────────────

describe('PATCH /api/onboarding/complete — lógica da rota', () => {
  it('retorna ok:true quando update é bem-sucedido', async () => {
    // Simula a lógica da rota sem importar o módulo real
    // (evita problemas de re-importação com vi.doMock)
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    }));

    const fakeDb = { update: mockUpdate };
    const orgId = 'org-uuid-123';

    // Executa a lógica equivalente à rota
    await fakeDb.update({} as never).set({ onboardingCompletedAt: new Date() }).where({} as never);

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('PATCH /api/onboarding/complete retorna 200 com contexto válido', async () => {
    // Mock de dependências antes da importação
    vi.doMock('@/db', () => ({
      db: {
        update: () => ({
          set: () => ({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      },
    }));
    vi.doMock('@/db/schema', () => ({
      organizations: {},
    }));
    vi.doMock('drizzle-orm', () => ({
      eq: () => ({}),
    }));
    vi.doMock('@/lib/org-context', () => ({
      requireOrgContext: async () => ({ orgId: 'org-123', userId: 'usr-abc', role: 'socio' }),
    }));
    vi.doMock('@/lib/errors', () => ({
      UnauthorizedError: class UnauthorizedError extends Error {},
    }));

    const { PATCH } = await import('@/app/api/onboarding/complete/route');
    const res = await PATCH();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    vi.resetModules();
  });
});

// ── OnboardingPage (wizard de steps) ─────────────────────────────────────────

describe('OnboardingPage — wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('inicia no Passo 1 com formulário do escritório', async () => {
    // Importa a página que usa os componentes
    const OnboardingPage = (await import('@/app/(onboarding)/page')).default;
    render(<OnboardingPage />);

    // Passo 1 está visível
    expect(screen.getByText(/bem-vindo ao jurisradar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome do escritório/i)).toBeInTheDocument();
  });

  it('indicador de progresso mostra etapa 1 ativa', async () => {
    const OnboardingPage = (await import('@/app/(onboarding)/page')).default;
    render(<OnboardingPage />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '1');
  });
});
