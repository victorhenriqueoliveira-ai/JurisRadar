// @vitest-environment jsdom
/**
 * Testes unitários para o toggle de contato de backup exposto na aba "Dados
 * pessoais" de /perfil (Fase 2 da auditoria crm-audit — o componente
 * BackupContatoToggle existia mas nunca era renderizado em nenhuma tela).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerfilForm from '../PerfilForm';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const INITIAL_DATA = {
  id: 'user-1',
  name: 'Fulano de Tal',
  email: 'fulano@teste.com',
  oabNumero: '123456',
  oabEstado: 'SP',
};

describe('PerfilForm — aba Dados pessoais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca o estado do contato de backup ao montar e renderiza o toggle', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/perfil/backup') {
        return Promise.resolve({ ok: true, json: async () => ({ isBackup: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<PerfilForm initialData={INITIAL_DATA} />);

    await waitFor(() => {
      expect(screen.getByText(/sou o contato de backup do escritório/i)).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/perfil/backup');
  });

  it('trata falha ao buscar o estado de backup sem travar a tela (assume false)', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/perfil/backup') {
        return Promise.reject(new Error('rede indisponível'));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<PerfilForm initialData={INITIAL_DATA} />);

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });
});
