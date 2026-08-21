/**
 * Testes de componente — BuscaFavoritos
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BuscaFavoritos from '../BuscaFavoritos';

describe('BuscaFavoritos', () => {
  const STORAGE_KEY = 'favoritos_datajud';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('não renderiza nada quando não há favoritos', () => {
    const { container } = render(
      <BuscaFavoritos fonte="datajud" onAplicar={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza lista de favoritos quando existem dados no localStorage', () => {
    const favoritos = [
      { id: 'fav-1', nome: 'Alimentos SP', params: { keyword: 'Alimentos', grau: 'G1' } },
      { id: 'fav-2', nome: 'Divórcio 2024', params: { keyword: 'Divórcio', dateFrom: '2024-01-01' } },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));

    render(<BuscaFavoritos fonte="datajud" onAplicar={vi.fn()} />);

    expect(screen.getByTestId('busca-favoritos')).toBeInTheDocument();
  });

  it('expande e exibe itens ao clicar no toggle', async () => {
    const favoritos = [
      { id: 'fav-1', nome: 'Alimentos SP', params: { keyword: 'Alimentos' } },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));

    const user = userEvent.setup();
    render(<BuscaFavoritos fonte="datajud" onAplicar={vi.fn()} />);

    await user.click(screen.getByTestId('btn-toggle-favoritos'));

    expect(screen.getByTestId('lista-favoritos')).toBeInTheDocument();
    expect(screen.getByText('Alimentos SP')).toBeInTheDocument();
  });

  it('chama onAplicar com os parâmetros corretos ao clicar em um favorito', async () => {
    const onAplicar = vi.fn();
    const params = { keyword: 'Alimentos', grau: 'G1' };
    const favoritos = [{ id: 'fav-1', nome: 'Alimentos SP', params }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));

    const user = userEvent.setup();
    render(<BuscaFavoritos fonte="datajud" onAplicar={onAplicar} />);

    // Expande
    await user.click(screen.getByTestId('btn-toggle-favoritos'));
    // Aplica
    await user.click(screen.getByTestId('btn-aplicar-favorito-fav-1'));

    expect(onAplicar).toHaveBeenCalledWith(params);
  });

  it('remove favorito do localStorage ao clicar no botão de remoção', async () => {
    const favoritos = [
      { id: 'fav-1', nome: 'Alimentos SP', params: { keyword: 'Alimentos' } },
      { id: 'fav-2', nome: 'Divórcio', params: { keyword: 'Divórcio' } },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritos));

    const user = userEvent.setup();
    render(<BuscaFavoritos fonte="datajud" onAplicar={vi.fn()} />);

    await user.click(screen.getByTestId('btn-toggle-favoritos'));
    await user.click(screen.getByTestId('btn-remover-favorito-fav-1'));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as { id: string }[];
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('fav-2');
  });

  it('usa chave de storage correta para cada fonte', () => {
    const djeFavoritos = [{ id: 'dje-1', nome: 'DJe busca', params: { term: 'rescisão' } }];
    localStorage.setItem('favoritos_dje', JSON.stringify(djeFavoritos));

    render(<BuscaFavoritos fonte="dje" onAplicar={vi.fn()} />);

    expect(screen.getByTestId('busca-favoritos')).toBeInTheDocument();
  });

  it('mantém isolamento: favoritos de datajud não aparecem para dje', () => {
    const datajudFavoritos = [{ id: 'dj-1', nome: 'DataJud busca', params: { keyword: 'alimentos' } }];
    localStorage.setItem('favoritos_datajud', JSON.stringify(datajudFavoritos));

    const { container } = render(<BuscaFavoritos fonte="dje" onAplicar={vi.fn()} />);
    // Sem favoritos_dje → não renderiza nada
    expect(container).toBeEmptyDOMElement();
  });
});
