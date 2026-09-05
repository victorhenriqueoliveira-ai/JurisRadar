/**
 * Testes unitários para aba Comunicações no ProcessoSheet (Task 23).
 *
 * Verifica:
 * - aba Comunicações renderiza histórico com ícones de canal
 * - estado vazio exibe "Nenhuma comunicação enviada ainda"
 * - modal "Notificar Cliente" abre e fecha com Escape
 * - seleção de canal WhatsApp exibe campo telefone
 * - seleção de canal E-mail exibe campo email
 * - envio WhatsApp chama POST e abre window.open
 * - envio E-mail chama POST e exibe toast
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock('../MovimentacaoTimeline', () => ({
  MovimentacaoTimeline: () => <div />,
}));

vi.mock('../NotasList', () => ({
  NotasList: () => <div />,
}));

vi.mock('@/components/financeiro/HonorarioForm', () => ({
  HonorarioForm: () => <div />,
}));

vi.mock('@/components/financeiro/PagamentoList', () => ({
  PagamentoList: () => <div />,
}));

vi.mock('@/components/processos/AnexoUpload', () => ({
  AnexoUpload: () => <div />,
}));

vi.mock('@/components/processos/AnexoList', () => ({
  AnexoList: () => <div />,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;
const mockWindowOpen = vi.fn();
global.window.open = mockWindowOpen;

// ── Import após mocks ─────────────────────────────────────────────────────────

import { ProcessoSheet } from '../ProcessoSheet';

const processoMock = {
  id: 'proc-uuid-1',
  numeroCnj: '0001234-56.2026.8.26.0001',
  tribunal: 'TJSP',
  responsavelNome: 'Dr. Carlos',
};

function renderSheet() {
  return render(
    <ProcessoSheet
      processo={processoMock}
      open={true}
      onOpenChange={() => {}}
    />,
  );
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('Aba Comunicações — histórico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ comunicacoes: [] }),
    });
  });

  it('renderiza aba Comunicações sem erro', async () => {
    renderSheet();
    expect(screen.getByText('Comunicações')).toBeInTheDocument();
  });

  it('exibe estado vazio quando histórico está vazio', async () => {
    renderSheet();
    fireEvent.click(screen.getByText('Comunicações'));

    await waitFor(() => {
      expect(screen.getByTestId('comunicacoes-empty')).toBeInTheDocument();
      expect(screen.getByTestId('comunicacoes-empty')).toHaveTextContent('Nenhuma comunicação enviada ainda');
    });
  });

  it('exibe ícone correto para canal whatsapp', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        comunicacoes: [
          { id: 'com-1', canal: 'whatsapp', mensagem: 'Olá!', enviadoPor: 'user-1', createdAt: new Date().toISOString() },
        ],
      }),
    });

    renderSheet();
    fireEvent.click(screen.getByText('Comunicações'));

    await waitFor(() => {
      const icone = screen.getByLabelText('whatsapp');
      expect(icone.textContent).toBe('📱');
    });
  });

  it('exibe ícone correto para canal email', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        comunicacoes: [
          { id: 'com-2', canal: 'email', mensagem: 'Atualização', enviadoPor: 'user-1', createdAt: new Date().toISOString() },
        ],
      }),
    });

    renderSheet();
    fireEvent.click(screen.getByText('Comunicações'));

    await waitFor(() => {
      const icone = screen.getByLabelText('email');
      expect(icone.textContent).toBe('✉️');
    });
  });
});

describe('Modal Notificar Cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ comunicacoes: [] }),
    });
  });

  async function openModal() {
    renderSheet();
    fireEvent.click(screen.getByText('Comunicações'));
    await waitFor(() => screen.getByText('Notificar Cliente'));
    fireEvent.click(screen.getByText('Notificar Cliente'));
    await waitFor(() => screen.getByRole('dialog'));
  }

  it('abre modal ao clicar em Notificar Cliente', async () => {
    await openModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fecha modal ao pressionar Escape', async () => {
    await openModal();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('exibe campo telefone quando canal WhatsApp selecionado', async () => {
    await openModal();
    expect(screen.getByPlaceholderText('+55 11 99999-9999')).toBeInTheDocument();
  });

  it('exibe campo email quando canal E-mail selecionado', async () => {
    await openModal();
    fireEvent.click(screen.getByText('✉️ E-mail'));
    expect(screen.getByPlaceholderText('cliente@exemplo.com')).toBeInTheDocument();
  });

  it('chama POST whatsapp-link e abre window.open ao enviar WhatsApp', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comunicacoes: [] }) }) // GET histórico
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://wa.me/5511999999999?text=Ol%C3%A1', comunicacaoId: 'com-1' }) }) // POST whatsapp
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comunicacoes: [] }) }); // GET atualizado

    await openModal();
    fireEvent.change(screen.getByPlaceholderText('+55 11 99999-9999'), { target: { value: '+55 11 99999-9999' } });
    fireEvent.click(screen.getByText('Abrir WhatsApp'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/comunicacoes/whatsapp-link', expect.any(Object));
      expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank', 'noopener,noreferrer');
    });
  });

  it('chama POST email ao enviar e-mail', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comunicacoes: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comunicacaoId: 'com-2', enviado: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comunicacoes: [] }) });

    await openModal();
    fireEvent.click(screen.getByText('✉️ E-mail'));
    await waitFor(() => screen.getByPlaceholderText('cliente@exemplo.com'));
    fireEvent.change(screen.getByPlaceholderText('cliente@exemplo.com'), { target: { value: 'cliente@test.com' } });
    fireEvent.click(screen.getByText('Enviar E-mail'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/comunicacoes/email', expect.any(Object));
    });
  });
});
