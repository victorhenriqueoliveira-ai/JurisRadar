// @vitest-environment jsdom
/**
 * Testes unitários do componente EscritorioClient — card "Dados do escritório".
 *
 * Nova seção da Fase 3: edita nome/CNPJ/área de atuação via
 * PATCH /api/organizacoes/me, antes só preenchível no onboarding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import EscritorioClient from '../EscritorioClient';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const ORGANIZACAO = { name: 'Escritório Teixeira', cnpj: '12.345.678/0001-90', areaAtuacao: 'Trabalhista' };

describe('EscritorioClient — Dados do escritório', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preenche o formulário com os dados atuais da organização', () => {
    render(<EscritorioClient equipe={[]} plano={null} organizacao={ORGANIZACAO} />);

    expect(screen.getByDisplayValue('Escritório Teixeira')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12.345.678/0001-90')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Trabalhista')).toBeInTheDocument();
  });

  it('ao salvar, chama PATCH /api/organizacoes/me com os dados editados', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    render(<EscritorioClient equipe={[]} plano={null} organizacao={ORGANIZACAO} />);

    fireEvent.change(screen.getByDisplayValue('Escritório Teixeira'), { target: { value: 'Escritório Teixeira & Associados' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/organizacoes/me', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Escritório Teixeira & Associados', cnpj: '12.345.678/0001-90', areaAtuacao: 'Trabalhista' }),
      }));
    });

    await waitFor(() => {
      expect(screen.getByText(/dados salvos com sucesso/i)).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro quando o nome está vazio', async () => {
    render(<EscritorioClient equipe={[]} plano={null} organizacao={ORGANIZACAO} />);

    fireEvent.change(screen.getByDisplayValue('Escritório Teixeira'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome do escritório é obrigatório/i)).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('exibe mensagem de erro quando o PATCH falha', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Erro ao atualizar' }) });
    render(<EscritorioClient equipe={[]} plano={null} organizacao={ORGANIZACAO} />);

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro ao atualizar')).toBeInTheDocument();
    });
  });
});
