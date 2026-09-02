/**
 * Testes unitários para POST /api/asaas/cobrancas/[id]/reenviar.
 *
 * Mockam @/db, @/auth e @/lib/email/send para isolar o route handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks estáticos ───────────────────────────────────────────────────────────

const mockDbSelect = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => mockDbSelect(),
  },
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}));

// React já é real — não precisa mock

// ── Imports após vi.mock ───────────────────────────────────────────────────────

import { auth } from '@/auth';
import { sendEmail } from '@/lib/email/send';
import { POST } from '../cobrancas/[id]/reenviar/route';

// ── Constantes ────────────────────────────────────────────────────────────────

const SESSION_COM_ORG = {
  user: { id: 'user-123', orgId: 'org-abc', role: 'socio' },
};

const COBRANCA_VALIDA = {
  id: 'cob-uuid-001',
  orgId: 'org-abc',
  status: 'overdue',
  vencimento: '2026-07-15',
  clienteNome: 'João Silva',
  clienteEmail: 'joao@example.com',
  valor: '1500.00',
  linkBoleto: 'https://boleto.asaas.com/001',
  linkPix: 'https://pix.asaas.com/001',
  qrCodePix: null,
  clienteCpfCnpj: '12345678900',
  honorarioId: 'hon-uuid-001',
  asaasPaymentId: 'pay-asaas-001',
  asaasSubscriptionId: null,
  tipo: 'unica',
  parcelaNumero: null,
  parcelaTotal: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const COBRANCA_SEM_LINKS = {
  ...COBRANCA_VALIDA,
  id: 'cob-uuid-002',
  linkBoleto: null,
  linkPix: null,
};

function makePostRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/asaas/cobrancas/${id}/reenviar`, {
    method: 'POST',
  });
}

function mockSelectRetornando(valores: unknown[]) {
  mockDbSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(valores),
      }),
    }),
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('POST /api/asaas/cobrancas/[id]/reenviar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await POST(makePostRequest('cob-uuid-001'), {
      params: { id: 'cob-uuid-001' },
    });

    expect(res.status).toBe(401);
  });

  it('retorna 404 quando cobrança não existe', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornando([]);

    const res = await POST(makePostRequest('id-inexistente'), {
      params: { id: 'id-inexistente' },
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('não encontrada');
  });

  it('retorna 404 quando cobrança pertence a outro org', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    // db retorna vazio porque filtro WHERE org_id = 'org-abc' não encontra cobrança de outro org
    mockSelectRetornando([]);

    const res = await POST(makePostRequest('cob-outro-org'), {
      params: { id: 'cob-outro-org' },
    });

    expect(res.status).toBe(404);
  });

  it('retorna 422 quando cobrança não tem link de pagamento', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornando([COBRANCA_SEM_LINKS]);

    const res = await POST(makePostRequest('cob-uuid-002'), {
      params: { id: 'cob-uuid-002' },
    });

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('link');
  });

  it('envia e-mail com clienteEmail correto em cobrança válida', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornando([COBRANCA_VALIDA]);
    vi.mocked(sendEmail).mockResolvedValueOnce({ id: 'email-id-001' });

    const res = await POST(makePostRequest('cob-uuid-001'), {
      params: { id: 'cob-uuid-001' },
    });

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'joao@example.com',
      }),
    );
  });

  it('retorna success=true com emailId quando envio é bem-sucedido', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornando([COBRANCA_VALIDA]);
    vi.mocked(sendEmail).mockResolvedValueOnce({ id: 'email-id-001' });

    const res = await POST(makePostRequest('cob-uuid-001'), {
      params: { id: 'cob-uuid-001' },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.emailId).toBe('email-id-001');
    expect(json.clienteEmail).toBe('joao@example.com');
  });

  it('retorna 500 quando sendEmail lança erro', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornando([COBRANCA_VALIDA]);
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Resend down'));

    const res = await POST(makePostRequest('cob-uuid-001'), {
      params: { id: 'cob-uuid-001' },
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Erro ao enviar');
  });

  it('envia e-mail com linkBoleto quando apenas boleto disponível', async () => {
    const cobrancaSoBoleto = { ...COBRANCA_VALIDA, linkPix: null };
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornando([cobrancaSoBoleto]);
    vi.mocked(sendEmail).mockResolvedValueOnce({ id: 'email-id-002' });

    const res = await POST(makePostRequest('cob-uuid-001'), {
      params: { id: 'cob-uuid-001' },
    });

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    // Verifica que react element foi criado (sendEmail chamado com react definido)
    const callArgs = vi.mocked(sendEmail).mock.calls[0][0];
    expect(callArgs.react).toBeDefined();
  });
});
