/**
 * Testes de componente — Página de busca DJE
 * Usa @testing-library/react com ambiente jsdom
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DjePage from '../page';

// Mock next/navigation (usado internamente por next/link, não pela página diretamente)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/dje',
  useSearchParams: () => new URLSearchParams(),
}));

const mockPublications = [
  {
    id: 'pub-1',
    processNumber: '1234567-89.2024.8.26.0100',
    instance: '1',
    court: '1ª Vara Cível',
    publishedAt: '2024-08-01',
    snippet: 'Contrato de <mark>locação</mark> rescindido',
  },
  {
    id: 'pub-2',
    processNumber: '9876543-21.2024.8.26.0100',
    instance: '2',
    court: '5ª Câmara de Direito Privado',
    publishedAt: '2024-08-02',
    snippet: 'Recurso de <mark>apelação</mark> provido',
  },
];

function makeSuccessResponse(overrides = {}) {
  return {
    searchId: 'search-abc',
    results: mockPublications,
    total: 2,
    page: 1,
    totalPages: 1,
    ...overrides,
  };
}

describe('DjePage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Renderização inicial ----

  it('renderiza os campos "Termo de busca", "Data inicial" e "Data final"', () => {
    render(<DjePage />);
    expect(screen.getByLabelText(/termo de busca/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data inicial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data final/i)).toBeInTheDocument();
  });

  it('aviso de cobertura "Cadernos 2 e 3 — Capital" é sempre visível na página', () => {
    render(<DjePage />);
    expect(screen.getByTestId('coverage-notice')).toBeInTheDocument();
    expect(screen.getByTestId('coverage-notice')).toHaveTextContent(
      'Cadernos 2 e 3 (Capital)',
    );
  });

  // ---- Validação do formulário ----

  it('submeter formulário com termo vazio exibe "Mínimo 2 caracteres" sem chamar a API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-01');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-31');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      expect(screen.getByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submeter formulário com dateFrom > dateTo exibe mensagem de validação sem chamar a API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/termo de busca/i), 'locação');
    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-31');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-01');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      expect(
        screen.getByText(/data final deve ser maior ou igual/i),
      ).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ---- Estado de carregamento ----

  it('durante o fetch, botão "Buscar" exibe estado de carregamento e está desabilitado', async () => {
    let resolveFetch!: (val: unknown) => void;
    const pendingFetch = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pendingFetch),
    );

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/termo de busca/i), 'locação');
    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-01');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-31');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      const btn = screen.getByTestId('search-button');
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent(/buscando/i);
    });

    // Liberar a promise para não deixar handlers pendentes
    resolveFetch({
      ok: true,
      json: async () => makeSuccessResponse(),
    });
  });

  // ---- Resultados ----

  it('quando a API retorna 0 resultados, exibe mensagem "Nenhuma publicação encontrada"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeSuccessResponse({ results: [], total: 0, totalPages: 0 }),
      }),
    );

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/termo de busca/i), 'locação');
    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-01');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-31');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('empty-state')).toHaveTextContent(
        /nenhuma publicação encontrada/i,
      );
    });
  });

  it('quando a API retorna resultados, PublicationCard renderiza número CNJ, instância e data para cada item', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeSuccessResponse(),
      }),
    );

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/termo de busca/i), 'locação');
    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-01');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-31');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      const processNumbers = screen.getAllByTestId('process-number');
      expect(processNumbers).toHaveLength(2);
      expect(processNumbers[0]).toHaveTextContent('1234567-89.2024.8.26.0100');
      expect(processNumbers[1]).toHaveTextContent('9876543-21.2024.8.26.0100');
    });

    const instances = screen.getAllByTestId('instance');
    expect(instances[0]).toHaveTextContent('1ª Instância');
    expect(instances[1]).toHaveTextContent('2ª Instância');

    const dates = screen.getAllByTestId('published-at');
    expect(dates[0]).toHaveTextContent('01/08/2024');
  });

  // ---- Snippet com <mark> ----

  it('snippet com <mark>termo</mark> é renderizado como tag <mark> no DOM, não como texto literal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeSuccessResponse(),
      }),
    );

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/termo de busca/i), 'locação');
    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-01');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-31');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      const snippets = screen.getAllByTestId('snippet');
      expect(snippets.length).toBeGreaterThan(0);
    });

    const snippets = screen.getAllByTestId('snippet');
    // O primeiro snippet deve conter um elemento <mark>, não texto "<mark>"
    const markElements = snippets[0].querySelectorAll('mark');
    expect(markElements.length).toBeGreaterThan(0);
    expect(snippets[0].textContent).not.toContain('<mark>');
  });

  // ---- Link TJSP ----

  it('link "Consultar no TJSP" tem target="_blank" e rel="noopener noreferrer"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeSuccessResponse(),
      }),
    );

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/termo de busca/i), 'locação');
    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-01');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-31');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      const tjspLinks = screen.getAllByTestId('tjsp-link');
      expect(tjspLinks.length).toBeGreaterThan(0);
      tjspLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  // ---- Paginação ----

  it('quando total > limit, botões de paginação são renderizados; clicar em "Próxima" dispara nova busca com page + 1', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeSuccessResponse({ total: 100, page: 1, totalPages: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeSuccessResponse({ total: 100, page: 2, totalPages: 2 }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/termo de busca/i), 'locação');
    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-01');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-31');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    const nextBtn = screen.getByTestId('next-page');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondCall = fetchMock.mock.calls[1];
      const body = JSON.parse(secondCall[1].body);
      expect(body.page).toBe(2);
    });
  });

  // ---- Aviso de cobertura persiste após busca ----

  it('aviso de cobertura permanece visível após resultado de busca', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeSuccessResponse(),
      }),
    );

    render(<DjePage />);

    await userEvent.type(screen.getByLabelText(/termo de busca/i), 'locação');
    await userEvent.type(screen.getByLabelText(/data inicial/i), '2024-08-01');
    await userEvent.type(screen.getByLabelText(/data final/i), '2024-08-31');
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      expect(screen.getAllByTestId('process-number')).toHaveLength(2);
    });

    expect(screen.getByTestId('coverage-notice')).toBeInTheDocument();
  });
});
