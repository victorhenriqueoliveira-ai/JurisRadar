// @vitest-environment jsdom
/**
 * Testes dos componentes do Hub Financeiro Asaas.
 *
 * Cobertura:
 * - CobrancaForm: validação de e-mail, criação bem-sucedida e exibição de link_boleto
 * - CobrancaList: badge vermelho para overdue, badge verde para received, botão Reenviar
 * - RelatorioInadimplentes: clique em "Reenviar cobrança" e feedback de sucesso
 * - AssinaturaForm: resumo "12x R$500,00" antes de submeter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// ── Mocks globais ─────────────────────────────────────────────────────────────

// react-hook-form funciona bem no jsdom; @hookform/resolvers precisa de zod disponível
// Mock fetch globalmente
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock next/navigation (não usado nesses componentes, mas evita erros de importação transitiva)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

// ─── Importações dos componentes ──────────────────────────────────────────────
import { CobrancaForm } from '../CobrancaForm';
import { CobrancaList, type CobrancaRow } from '../CobrancaList';
import { RelatorioInadimplentes, type InadimplenteRow } from '../RelatorioInadimplentes';
import { AssinaturaForm } from '../AssinaturaForm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCobranca(overrides?: Partial<CobrancaRow>): CobrancaRow {
  return {
    id: 'cob-1',
    clienteNome: 'João Silva',
    clienteEmail: 'joao@exemplo.com',
    valor: '1500.00',
    vencimento: '2026-09-30',
    status: 'pending',
    tipo: 'unica',
    linkBoleto: null,
    linkPix: null,
    ...overrides,
  };
}

function makeInadimplente(overrides?: Partial<InadimplenteRow>): InadimplenteRow {
  return {
    id: 'inad-1',
    clienteNome: 'Maria Souza',
    clienteEmail: 'maria@exemplo.com',
    clienteCpfCnpj: '123.456.789-00',
    valor: '2000.00',
    vencimento: '2026-08-01',
    diasAtraso: 30,
    cobrancaId: 'cob-99',
    ...overrides,
  };
}

// ─── CobrancaForm ─────────────────────────────────────────────────────────────

describe('CobrancaForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe erro de validação quando clienteEmail está em branco e formulário é submetido', async () => {
    render(<CobrancaForm honorarioId="3fa85f64-5717-4562-b3fc-2c963f66afa6" />);

    // Preenche campos obrigatórios, mas deixa e-mail em branco
    fireEvent.change(screen.getByTestId('field-valor'), { target: { value: '500' } });
    fireEvent.change(screen.getByTestId('field-vencimento'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByTestId('field-cliente-nome'), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByTestId('field-cliente-cpf-cnpj'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByTestId('field-descricao'), { target: { value: 'Honorários advocatícios' } });
    // campo clienteEmail fica vazio

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-criar-cobranca'));
    });

    // Deve exibir mensagem de validação para o e-mail
    await waitFor(() => {
      // A mensagem pode vir do Zod em pt-BR
      const emailErrors = screen.getAllByText(/e-mail|email|inválido/i);
      expect(emailErrors.length).toBeGreaterThan(0);
    });

    // Não deve ter chamado fetch
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('com dados válidos chama POST /api/asaas/cobrancas e exibe link_boleto na resposta', async () => {
    const linkBoleto = 'https://boleto.exemplo.com/abc123';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'cob-novo',
        linkBoleto,
        linkPix: null,
        qrCodePix: null,
        vencimento: '2026-12-31',
        status: 'pending',
      }),
    });

    render(<CobrancaForm honorarioId="3fa85f64-5717-4562-b3fc-2c963f66afa6" />);

    fireEvent.change(screen.getByTestId('field-valor'), { target: { value: '500' } });
    fireEvent.change(screen.getByTestId('field-vencimento'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByTestId('field-cliente-nome'), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByTestId('field-cliente-email'), { target: { value: 'joao@exemplo.com' } });
    fireEvent.change(screen.getByTestId('field-cliente-cpf-cnpj'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByTestId('field-descricao'), { target: { value: 'Honorários advocatícios do mês' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-criar-cobranca'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/asaas/cobrancas',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('cobranca-resultado')).toBeInTheDocument();
      expect(screen.getByTestId('link-boleto')).toHaveAttribute('href', linkBoleto);
    });
  });
});

// ─── CobrancaList ─────────────────────────────────────────────────────────────

describe('CobrancaList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('com cobrança overdue exibe badge vermelho e botão Reenviar', async () => {
    const cobrancaOverdue = makeCobranca({ id: 'cob-overdue', status: 'overdue' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cobrancas: [cobrancaOverdue] }),
    });

    render(<CobrancaList />);

    await waitFor(() => {
      expect(screen.getByTestId('cobranca-list')).toBeInTheDocument();
    });

    // Badge deve exibir texto "Vencida" e ter cor vermelha
    const badge = screen.getByTestId('status-badge-overdue');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Vencida');
    // Verifica a cor vermelha via estilo inline
    expect(badge).toHaveStyle({ color: '#991b1b' });

    // Botão Reenviar deve existir para cobranças vencidas
    expect(screen.getByTestId(`btn-reenviar-cob-overdue`)).toBeInTheDocument();
  });

  it('com cobrança received exibe badge verde sem botão Reenviar', async () => {
    const cobrancaReceived = makeCobranca({ id: 'cob-received', status: 'received' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cobrancas: [cobrancaReceived] }),
    });

    render(<CobrancaList />);

    await waitFor(() => {
      expect(screen.getByTestId('cobranca-list')).toBeInTheDocument();
    });

    // Badge deve exibir texto "Recebida" e ter cor verde
    const badge = screen.getByTestId('status-badge-received');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Recebida');
    expect(badge).toHaveStyle({ color: '#166534' });

    // Botão Reenviar NÃO deve existir para cobranças recebidas
    expect(screen.queryByTestId('btn-reenviar-cob-received')).not.toBeInTheDocument();
  });
});

// ─── RelatorioInadimplentes ────────────────────────────────────────────────────

describe('RelatorioInadimplentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clique em "Reenviar cobrança" chama POST /api/asaas/cobrancas/[id]/reenviar e exibe feedback de sucesso', async () => {
    const inadimplente = makeInadimplente();

    // GET /api/asaas/inadimplentes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ inadimplentes: [inadimplente] }),
    });

    // POST /api/asaas/cobrancas/cob-99/reenviar
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<RelatorioInadimplentes />);

    await waitFor(() => {
      expect(screen.getByTestId('inadimplente-row')).toBeInTheDocument();
    });

    const btnReenviar = screen.getByTestId(`btn-reenviar-cobranca-cob-99`);
    expect(btnReenviar).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(btnReenviar);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/asaas/cobrancas/cob-99/reenviar',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      const feedback = screen.getByTestId('feedback-reenvio-cob-99');
      expect(feedback).toHaveTextContent('Cobrança reenviada!');
    });
  });
});

// ─── AssinaturaForm ───────────────────────────────────────────────────────────

describe('AssinaturaForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('com parcelas = 12 e valor = 500 exibe "12x R$500,00" antes de submeter', async () => {
    render(<AssinaturaForm honorarioId="3fa85f64-5717-4562-b3fc-2c963f66afa6" />);

    // Preenche valor
    fireEvent.change(screen.getByTestId('field-valor'), { target: { value: '500' } });

    // Preenche número de parcelas
    fireEvent.change(screen.getByTestId('field-parcelas'), { target: { value: '12' } });

    await waitFor(() => {
      const resumo = screen.getByTestId('resumo-assinatura');
      expect(resumo).toBeInTheDocument();
      expect(resumo).toHaveTextContent('12x');
      expect(resumo).toHaveTextContent('R$ 500,00');
    });
  });
});
