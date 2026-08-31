/**
 * Testes unitários para POST /api/asaas/assinaturas.
 *
 * Mockam @/db, @/auth e @/lib/asaas/client para isolar o route handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks estáticos ───────────────────────────────────────────────────────────

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();

vi.mock('@/db', () => ({
  db: {
    select: () => mockDbSelect(),
    insert: () => mockDbInsert(),
  },
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/asaas/client', () => ({
  asaasClient: {
    criarAssinatura: vi.fn(),
  },
}));

// ── Imports após vi.mock ───────────────────────────────────────────────────────

import { auth } from '@/auth';
import { asaasClient } from '@/lib/asaas/client';
import { AsaasError } from '@/lib/asaas/errors';
import { POST } from '../assinaturas/route';

// ── Constantes ────────────────────────────────────────────────────────────────

const SESSION_COM_ORG = {
  user: { id: 'user-123', orgId: 'org-abc', role: 'socio' },
};

const BODY_VALIDO = {
  honorarioId: '00000000-0000-0000-0000-000000000001',
  valor: 500.0,
  ciclo: 'MONTHLY',
  dataInicio: '2026-11-01',
  totalParcelas: 12,
  clienteEmail: 'cliente@example.com',
  clienteNome: 'Maria Oliveira',
  clienteCpfCnpj: '987.654.321-00',
  descricao: 'Honorários mensais — Processo 0001234',
};

const HONORARIO_DB = {
  id: '00000000-0000-0000-0000-000000000001',
  orgId: 'org-abc',
  tipo: 'mensal',
  statusPagamento: 'pendente',
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/asaas/assinaturas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockSelectRetornos(valores: unknown[][]) {
  let chamada = 0;
  mockDbSelect.mockImplementation(() => {
    const retorno = valores[chamada] ?? [];
    chamada++;
    return {
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(retorno),
        }),
      }),
    };
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('POST /api/asaas/assinaturas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await POST(makeRequest(BODY_VALIDO));

    expect(res.status).toBe(401);
  });

  it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await POST(makeRequest({ valor: 500 })); // falta honorarioId, ciclo, etc.

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detalhes).toBeDefined();
    expect(json.detalhes.honorarioId).toBeDefined();
    expect(json.detalhes.ciclo).toBeDefined();
  });

  it('retorna 400 para ciclo inválido', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await POST(makeRequest({ ...BODY_VALIDO, ciclo: 'DAILY' }));

    expect(res.status).toBe(400);
  });

  it('retorna 404 quando honorarioId não pertence ao org_id', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornos([[]]);

    const res = await POST(makeRequest(BODY_VALIDO));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('Honorário não encontrado');
  });

  it('cria assinatura com dados válidos e retorna 201 com asaasSubscriptionId', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornos([[HONORARIO_DB]]);
    vi.mocked(asaasClient.criarAssinatura).mockResolvedValueOnce({
      asaasSubscriptionId: 'sub-asaas-001',
      status: 'ACTIVE',
      valor: 500,
      ciclo: 'MONTHLY',
      proximaCobranca: '2026-11-01',
    });
    mockDbInsert.mockReturnValue({
      values: () => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'cobranca-recorrente-uuid',
              tipo: 'recorrente',
              asaasSubscriptionId: 'sub-asaas-001',
            },
          ]),
      }),
    });

    const res = await POST(makeRequest(BODY_VALIDO));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('cobranca-recorrente-uuid');
    expect(json.asaasSubscriptionId).toBe('sub-asaas-001');
    expect(json.ciclo).toBe('MONTHLY');
    expect(asaasClient.criarAssinatura).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-abc',
        honorarioId: '00000000-0000-0000-0000-000000000001',
        totalParcelas: 12,
      }),
    );
  });

  it('retorna 422 quando o AsaasClient lança AsaasError', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornos([[HONORARIO_DB]]);
    vi.mocked(asaasClient.criarAssinatura).mockRejectedValueOnce(
      new AsaasError('Sub-conta não ativa', 'account_not_active', 400),
    );

    const res = await POST(makeRequest(BODY_VALIDO));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('Sub-conta não ativa');
    expect(json.code).toBe('account_not_active');
  });
});
