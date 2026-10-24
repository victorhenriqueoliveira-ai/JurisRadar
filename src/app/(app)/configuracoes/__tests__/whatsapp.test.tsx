// @vitest-environment jsdom
/**
 * Testes de integração — aba Notificações de /configuracoes expõe o
 * formulário de WhatsApp (achado da auditoria: WhatsAppForm existia e era
 * testado, mas nunca era renderizado em nenhuma tela do app).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/configuracoes',
  useSearchParams: () => new URLSearchParams('aba=notificacoes'),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import ConfiguracoesPage from '../page';

describe('Configurações — aba Notificações — WhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'user-1',
        notificationPrefs: { emailDesativado: [] },
        whatsappNumero: '+5511999999999',
      }),
    });
  });

  it('renderiza o formulário de WhatsApp pré-preenchido com o número atual', async () => {
    render(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/whatsapp/i)).toHaveValue('+5511999999999');
  });

  it('exibe o aviso honesto de que alertas automáticos hoje vão só por e-mail', async () => {
    render(<ConfiguracoesPage />);

    await waitFor(() => {
      expect(screen.getByText(/alertas de intimações críticas são enviados apenas por e-mail/i)).toBeInTheDocument();
    });
  });
});
