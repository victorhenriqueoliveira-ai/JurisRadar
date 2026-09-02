// @vitest-environment jsdom
/**
 * Testes unitários do componente WhatsAppForm.
 *
 * Valida:
 * - Número +5511999999999 (E.164 válido) permite submeter
 * - Número sem DDI (11999999999) exibe erro antes de submeter
 * - Número vazio exibe erro de validação
 * - Sucesso exibe mensagem de confirmação
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WhatsAppForm } from '../WhatsAppForm';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WhatsAppForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });

  it('renderiza campo WhatsApp e aviso sobre intimações', () => {
    render(<WhatsAppForm />);
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
    expect(screen.getByText(/necessário para receber alertas de intimações críticas/i)).toBeInTheDocument();
  });

  it('número +5511999999999 válido permite submeter o formulário', async () => {
    render(<WhatsAppForm />);

    fireEvent.change(screen.getByLabelText(/whatsapp/i), {
      target: { value: '+5511999999999' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /salvar whatsapp/i }).closest('form')!);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/perfil/contato',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ whatsapp_numero: '+5511999999999' }),
        }),
      );
      expect(screen.getByText(/whatsapp salvo com sucesso/i)).toBeInTheDocument();
    });
  });

  it('número sem DDI (11999999999) exibe erro antes de submeter', async () => {
    render(<WhatsAppForm />);

    fireEvent.change(screen.getByLabelText(/whatsapp/i), {
      target: { value: '11999999999' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /salvar whatsapp/i }).closest('form')!);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('número com formatação +55 (11) 99999-9999 é normalizado para E.164 antes de submeter', async () => {
    render(<WhatsAppForm />);

    fireEvent.change(screen.getByLabelText(/whatsapp/i), {
      target: { value: '+55 (11) 99999-9999' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /salvar whatsapp/i }).closest('form')!);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/perfil/contato',
        expect.objectContaining({
          body: JSON.stringify({ whatsapp_numero: '+5511999999999' }),
        }),
      );
    });
  });

  it('campo vazio exibe erro de validação sem chamar API', async () => {
    render(<WhatsAppForm />);

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /salvar whatsapp/i }).closest('form')!);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('pré-preenche o campo com whatsappAtual quando fornecido', () => {
    render(<WhatsAppForm whatsappAtual="+5521987654321" />);
    const input = screen.getByLabelText(/whatsapp/i) as HTMLInputElement;
    expect(input.value).toBe('+5521987654321');
  });

  it('exibe erro de servidor quando PATCH falha', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Número já cadastrado.' }),
    });

    render(<WhatsAppForm />);

    fireEvent.change(screen.getByLabelText(/whatsapp/i), {
      target: { value: '+5511999999999' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /salvar whatsapp/i }).closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/número já cadastrado/i);
    });
  });
});
