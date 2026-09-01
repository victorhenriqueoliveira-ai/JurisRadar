// @vitest-environment jsdom
/**
 * Testes dos componentes de garantia de intimação:
 *   - ConfirmarCienciaButton
 *   - GarantiaStatusIndicator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ConfirmarCienciaButton } from '../ConfirmarCienciaButton';
import { GarantiaStatusIndicator } from '../GarantiaStatusIndicator';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock TIPOS_CRITICOS do inngest dispatcher
vi.mock('@/inngest/notificacao-dispatcher', () => ({
  TIPOS_CRITICOS: ['intimacao', 'citacao', 'prazo_fatal', 'decisao', 'sentenca'],
}));

// ── ConfirmarCienciaButton ─────────────────────────────────────────────────────

describe('ConfirmarCienciaButton', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe botão ativo "Confirmar ciência" para tipo crítico com confirmadoEm=null', () => {
    render(
      <ConfirmarCienciaButton
        notificacaoId="notif-1"
        tipo="intimacao"
        confirmadoEm={null}
      />,
    );

    const btn = screen.getByTestId('confirmar-ciencia-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Confirmar ciência');
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute('data-confirmado', 'false');
  });

  it('exibe botão desabilitado "Ciência confirmada" quando confirmadoEm != null', () => {
    render(
      <ConfirmarCienciaButton
        notificacaoId="notif-1"
        tipo="citacao"
        confirmadoEm="2026-08-30T10:00:00Z"
      />,
    );

    const btn = screen.getByTestId('confirmar-ciencia-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Ciência confirmada');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('data-confirmado', 'true');
  });

  it('não renderiza nada para tipo não crítico "nova_movimentacao"', () => {
    render(
      <ConfirmarCienciaButton
        notificacaoId="notif-1"
        tipo="nova_movimentacao"
        confirmadoEm={null}
      />,
    );

    expect(screen.queryByTestId('confirmar-ciencia-button')).not.toBeInTheDocument();
  });

  it('não renderiza nada para tipo "publicacao_dje"', () => {
    render(
      <ConfirmarCienciaButton
        notificacaoId="notif-1"
        tipo="publicacao_dje"
        confirmadoEm={null}
      />,
    );

    expect(screen.queryByTestId('confirmar-ciencia-button')).not.toBeInTheDocument();
  });

  it('clique no botão chama POST /api/notificacoes/[id]/confirmar e aplica optimistic update', async () => {
    const onConfirmado = vi.fn();

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, garantiaId: 'garantia-1' }),
    } as Response);

    render(
      <ConfirmarCienciaButton
        notificacaoId="notif-123"
        tipo="decisao"
        confirmadoEm={null}
        onConfirmado={onConfirmado}
      />,
    );

    const btn = screen.getByTestId('confirmar-ciencia-button');
    expect(btn).toHaveTextContent('Confirmar ciência');

    await act(async () => {
      fireEvent.click(btn);
    });

    // Verifica que chamou o endpoint correto
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/notificacoes/notif-123/confirmar',
      expect.objectContaining({ method: 'POST' }),
    );

    // Verifica que o botão foi desabilitado após confirmação (optimistic update)
    await waitFor(() => {
      expect(screen.getByTestId('confirmar-ciencia-button')).toHaveTextContent('Ciência confirmada');
      expect(screen.getByTestId('confirmar-ciencia-button')).toBeDisabled();
    });

    // Verifica callback chamado
    expect(onConfirmado).toHaveBeenCalledTimes(1);
  });

  it('botão desabilita imediatamente ao clique (sem duplo clique)', async () => {
    // Fetch que nunca resolve — simula loading longo
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));

    render(
      <ConfirmarCienciaButton
        notificacaoId="notif-1"
        tipo="sentenca"
        confirmadoEm={null}
      />,
    );

    const btn = screen.getByTestId('confirmar-ciencia-button');

    act(() => {
      fireEvent.click(btn);
    });

    // Deve mostrar estado de loading (optimistic update antecipado)
    await waitFor(() => {
      expect(screen.getByTestId('confirmar-ciencia-button')).toBeDisabled();
    });
  });

  it('reverte optimistic update se a requisição falhar com erro de rede', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    render(
      <ConfirmarCienciaButton
        notificacaoId="notif-1"
        tipo="intimacao"
        confirmadoEm={null}
      />,
    );

    const btn = screen.getByTestId('confirmar-ciencia-button');

    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => {
      // Botão voltou ao estado original
      expect(screen.getByTestId('confirmar-ciencia-button')).toHaveTextContent('Confirmar ciência');
      expect(screen.getByTestId('confirmar-ciencia-button')).not.toBeDisabled();
      // Mensagem de erro exibida
      expect(screen.getByTestId('confirmar-ciencia-erro')).toBeInTheDocument();
    });
  });

  it('trata resposta 409 (já confirmado) sem exibir erro', async () => {
    const confirmadoEm = '2026-08-30T12:00:00Z';
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Já confirmado', confirmadoEm }),
    } as Response);

    render(
      <ConfirmarCienciaButton
        notificacaoId="notif-1"
        tipo="intimacao"
        confirmadoEm={null}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmar-ciencia-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('confirmar-ciencia-button')).toHaveTextContent('Ciência confirmada');
      expect(screen.queryByTestId('confirmar-ciencia-erro')).not.toBeInTheDocument();
    });
  });

  it('todos os tipos críticos são aceitos', () => {
    const tiposCriticos = ['intimacao', 'citacao', 'prazo_fatal', 'decisao', 'sentenca'];

    for (const tipo of tiposCriticos) {
      const { unmount } = render(
        <ConfirmarCienciaButton
          notificacaoId="notif-1"
          tipo={tipo}
          confirmadoEm={null}
        />,
      );
      expect(screen.getByTestId('confirmar-ciencia-button')).toBeInTheDocument();
      unmount();
    }
  });
});

// ── GarantiaStatusIndicator ───────────────────────────────────────────────────

describe('GarantiaStatusIndicator', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe badge azul para step "email_enviado"', () => {
    render(
      <GarantiaStatusIndicator
        notificacaoId="notif-1"
        initialState={{
          step: 'email_enviado',
          emailEnviadoEm: '2026-08-30T10:00:00Z',
          smsEnviadoEm: null,
          whatsappEnviadoEm: null,
          backupNotificadoEm: null,
          confirmadoEm: null,
        }}
      />,
    );

    const badge = screen.getByTestId('garantia-status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-step', 'email_enviado');
    expect(badge).toHaveTextContent('E-mail enviado');
    expect(badge.className).toContain('blue');
  });

  it('exibe badge laranja para step "sms_whatsapp_enviado" (urgente)', () => {
    render(
      <GarantiaStatusIndicator
        notificacaoId="notif-1"
        initialState={{
          step: 'sms_whatsapp_enviado',
          emailEnviadoEm: '2026-08-30T10:00:00Z',
          smsEnviadoEm: '2026-08-30T12:00:00Z',
          whatsappEnviadoEm: '2026-08-30T12:00:00Z',
          backupNotificadoEm: null,
          confirmadoEm: null,
        }}
      />,
    );

    const badge = screen.getByTestId('garantia-status-badge');
    expect(badge).toHaveAttribute('data-step', 'sms_whatsapp_enviado');
    expect(badge).toHaveTextContent('SMS/WhatsApp enviado');
    expect(badge.className).toContain('orange');
  });

  it('exibe badge vermelho para step "backup_notificado" (crítico)', () => {
    render(
      <GarantiaStatusIndicator
        notificacaoId="notif-1"
        initialState={{
          step: 'backup_notificado',
          emailEnviadoEm: '2026-08-30T10:00:00Z',
          smsEnviadoEm: '2026-08-30T12:00:00Z',
          whatsappEnviadoEm: '2026-08-30T12:00:00Z',
          backupNotificadoEm: '2026-08-30T14:00:00Z',
          confirmadoEm: null,
        }}
      />,
    );

    const badge = screen.getByTestId('garantia-status-badge');
    expect(badge).toHaveAttribute('data-step', 'backup_notificado');
    expect(badge).toHaveTextContent('Contato backup acionado');
    expect(badge.className).toContain('red');
  });

  it('exibe badge verde para step "confirmado"', () => {
    render(
      <GarantiaStatusIndicator
        notificacaoId="notif-1"
        initialState={{
          step: 'confirmado',
          emailEnviadoEm: '2026-08-30T10:00:00Z',
          smsEnviadoEm: null,
          whatsappEnviadoEm: null,
          backupNotificadoEm: null,
          confirmadoEm: '2026-08-30T11:00:00Z',
        }}
      />,
    );

    const badge = screen.getByTestId('garantia-status-badge');
    expect(badge).toHaveAttribute('data-step', 'confirmado');
    expect(badge).toHaveTextContent('Ciência confirmada');
    expect(badge.className).toContain('green');
  });

  it('não renderiza nada quando initialState=null (sem garantia)', () => {
    render(
      <GarantiaStatusIndicator
        notificacaoId="notif-1"
        initialState={null}
      />,
    );

    expect(screen.queryByTestId('garantia-status-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('garantia-status-loading')).not.toBeInTheDocument();
  });

  it('busca via fetch quando initialState não é fornecido e exibe badge correto', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        step: 'sms_whatsapp_enviado',
        emailEnviadoEm: '2026-08-30T10:00:00Z',
        smsEnviadoEm: '2026-08-30T12:00:00Z',
        whatsappEnviadoEm: null,
        backupNotificadoEm: null,
        confirmadoEm: null,
      }),
    } as Response);

    render(<GarantiaStatusIndicator notificacaoId="notif-abc" />);

    // Inicialmente mostra loading
    expect(screen.getByTestId('garantia-status-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/notificacoes/notif-abc/garantia');
    });

    await waitFor(() => {
      expect(screen.getByTestId('garantia-status-badge')).toHaveAttribute(
        'data-step',
        'sms_whatsapp_enviado',
      );
    });
  });

  it('não renderiza nada quando API retorna 204 (sem garantia)', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 204,
      json: async () => null,
    } as Response);

    render(<GarantiaStatusIndicator notificacaoId="notif-abc" />);

    await waitFor(() => {
      expect(screen.queryByTestId('garantia-status-badge')).not.toBeInTheDocument();
    });
  });

  it('badge possui role="status" e aria-label acessível', () => {
    render(
      <GarantiaStatusIndicator
        notificacaoId="notif-1"
        initialState={{
          step: 'backup_notificado',
          emailEnviadoEm: '2026-08-30T10:00:00Z',
          smsEnviadoEm: '2026-08-30T12:00:00Z',
          whatsappEnviadoEm: null,
          backupNotificadoEm: '2026-08-30T14:00:00Z',
          confirmadoEm: null,
        }}
      />,
    );

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label');
    expect(badge.getAttribute('aria-label')).toContain('Protocolo de garantia');
  });
});
