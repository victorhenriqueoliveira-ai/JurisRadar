// @vitest-environment jsdom
/**
 * Testes unitários do componente BackupContatoToggle.
 *
 * Valida:
 * - Renderização do toggle com estado inicial
 * - Ao clicar, chama PATCH /api/perfil/backup com isBackup correto
 * - Em caso de erro, reverte o estado e exibe mensagem
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BackupContatoToggle } from '../BackupContatoToggle';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BackupContatoToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });

  it('renderiza o toggle com label descritivo', () => {
    render(<BackupContatoToggle isBackupAtual={false} />);
    expect(screen.getByText(/sou o contato de backup do escritório/i)).toBeInTheDocument();
  });

  it('exibe o toggle desmarcado quando isBackupAtual = false', () => {
    render(<BackupContatoToggle isBackupAtual={false} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('exibe o toggle marcado quando isBackupAtual = true', () => {
    render(<BackupContatoToggle isBackupAtual={true} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('ao marcar, chama PATCH /api/perfil/backup com isBackup = true', async () => {
    render(<BackupContatoToggle isBackupAtual={false} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/perfil/backup',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ isBackup: true }),
        }),
      );
    });
  });

  it('ao desmarcar, chama PATCH /api/perfil/backup com isBackup = false', async () => {
    render(<BackupContatoToggle isBackupAtual={true} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/perfil/backup',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ isBackup: false }),
        }),
      );
    });
  });

  it('exibe "Configuração de backup salva" após sucesso', async () => {
    render(<BackupContatoToggle isBackupAtual={false} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox'));
    });

    await waitFor(() => {
      expect(screen.getByText(/configuração de backup salva/i)).toBeInTheDocument();
    });
  });

  it('em caso de erro, reverte o estado do toggle e exibe mensagem', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Erro interno.' }),
    });

    render(<BackupContatoToggle isBackupAtual={false} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox'));
    });

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false); // revertido
      expect(screen.getByRole('alert')).toHaveTextContent(/erro interno/i);
    });
  });
});
