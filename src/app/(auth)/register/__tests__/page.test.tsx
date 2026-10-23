// @vitest-environment jsdom
/**
 * Testes unitários da página de cadastro — checkbox de aceite dos Termos.
 *
 * Cobre a Fase 4 (LGPD): o botão "Criar conta grátis" fica desabilitado até o
 * usuário marcar o aceite, e o aceite é enviado no body da requisição.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(() => Promise.resolve({ error: null })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import RegisterPage from '../page';

describe('RegisterPage — aceite de termos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function preencherCampos() {
    fireEvent.change(screen.getByPlaceholderText('João da Silva'), { target: { value: 'Maria Advogada' } });
    fireEvent.change(screen.getByPlaceholderText('joao@escritorio.com.br'), { target: { value: 'maria@escritorio.com.br' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'senha12345' } });
  }

  it('o botão de criar conta começa desabilitado', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /criar conta grátis/i })).toBeDisabled();
  });

  it('habilita o botão ao marcar o checkbox de aceite', () => {
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: /criar conta grátis/i })).not.toBeDisabled();
  });

  it('inclui aceiteTermos: true no body da requisição ao submeter', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    render(<RegisterPage />);

    preencherCampos();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /criar conta grátis/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
        method: 'POST',
      }));
    });

    const [, options] = mockFetch.mock.calls[0];
    const sentBody = JSON.parse(options.body as string);
    expect(sentBody.aceiteTermos).toBe(true);
  });

  it('exibe os links para Termos de Uso e Política de Privacidade', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('link', { name: /termos de uso/i })).toHaveAttribute('href', '/termos-de-uso');
    expect(screen.getByRole('link', { name: /política de privacidade/i })).toHaveAttribute('href', '/politica-privacidade');
  });
});
