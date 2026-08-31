/**
 * Testes unitários para POST /api/asaas/cobrancas e GET /api/asaas/cobrancas.
 *
 * Mockam @/db, @/auth e @/lib/asaas/client para isolar os route handlers.
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
    criarCobranca: vi.fn(),
  },
}));

// ── Imports após vi.mock ───────────────────────────────────────────────────────

import { auth } from '@/auth';
import { asaasClient } from '@/lib/asaas/client';
import { AsaasError } from '@/lib/asaas/errors';
import { POST, GET } from '../cobrancas/route';

// ── Constantes ────────────────────────────────────────────────────────────────

const SESSION_COM_ORG = {
  user: { id: 'user-123', orgId: 'org-abc', role: 'socio' },
};

const BODY_VALIDO = {
  honorarioId: '00000000-0000-0000-0000-000000000001',
  valor: 1500.0,
  vencimento: '2026-10-15',
  tipo: 'BOLETO_PIX',
  clienteEmail: 'cliente@example.com',
  clienteNome: 'João Silva',
  clienteCpfCnpj: '123.456.789-00',
  descricao: 'Honorários — Processo 0001234-56.2026.8.26.0100',
};

const HONORARIO_DB = {
  id: '00000000-0000-0000-0000-000000000001',
  orgId: 'org-abc',
  tipo: 'fixo',
  statusPagamento: 'pendente',
};

const COBRANCA_ASAAS = {
  asaasPaymentId: 'pay-asaas-789',
  status: 'PENDING' as const,
  valor: 1500.0,
  vencimento: '2026-10-15',
  linkBoleto: 'https://boleto.asaas.com/abc',
  linkPix: 'https://pix.asaas.com/abc',
  qrCodePix: '00020126...',
};

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/asaas/cobrancas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/asaas/cobrancas${query}`, {
    method: 'GET',
  });
}

// Helper para mock de select encadeado com múltiplas chamadas
function mockSelectRetornos(valores: unknown[][]) {
  let chamada = 0;
  mockDbSelect.mockImplementation(() => {
    const retorno = valores[chamada] ?? [];
    chamada++;
    return {
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(retorno),
          orderBy: () => Promise.resolve(retorno),
        }),
        orderBy: () => Promise.resolve(retorno),
      }),
    };
  });
}

// ── Testes POST ───────────────────────────────────────────────────────────────

describe('POST /api/asaas/cobrancas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await POST(makePostRequest(BODY_VALIDO));

    expect(res.status).toBe(401);
  });

  it('retorna 400 quando clienteEmail está faltando', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    const bodyInvalido = { ...BODY_VALIDO, clienteEmail: undefined };

    const res = await POST(makePostRequest(bodyInvalido));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detalhes).toBeDefined();
    expect(json.detalhes.clienteEmail).toBeDefined();
  });

  it('retorna 400 com mensagens Zod para múltiplos campos inválidos', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await POST(makePostRequest({ honorarioId: 'nao-e-uuid', valor: -100 }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detalhes.honorarioId).toBeDefined();
    expect(json.detalhes.valor).toBeDefined();
  });

  it('retorna 404 quando honorarioId não pertence ao org_id', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    // Honorário não encontrado (isolamento)
    mockSelectRetornos([[]]);

    const res = await POST(makePostRequest(BODY_VALIDO));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('Honorário não encontrado');
  });

  it('cria cobrança com dados válidos e retorna { linkBoleto, linkPix }', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornos([[HONORARIO_DB]]);
    vi.mocked(asaasClient.criarCobranca).mockResolvedValueOnce(COBRANCA_ASAAS);
    mockDbInsert.mockReturnValue({
      values: () => ({
        returning: () =>
          Promise.resolve([{ id: 'cobranca-uuid-001', ...COBRANCA_ASAAS }]),
      }),
    });

    const res = await POST(makePostRequest(BODY_VALIDO));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('cobranca-uuid-001');
    expect(json.linkBoleto).toBe('https://boleto.asaas.com/abc');
    expect(json.linkPix).toBe('https://pix.asaas.com/abc');
    expect(json.status).toBe('pending');
  });

  it('retorna 422 quando o AsaasClient lança AsaasError', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornos([[HONORARIO_DB]]);
    vi.mocked(asaasClient.criarCobranca).mockRejectedValueOnce(
      new AsaasError('Cliente não encontrado no Asaas', 'customer_not_found', 400),
    );

    const res = await POST(makePostRequest(BODY_VALIDO));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('Cliente não encontrado no Asaas');
  });
});

// ── Testes GET ────────────────────────────────────────────────────────────────

describe('GET /api/asaas/cobrancas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
  });

  it('retorna apenas cobranças vencidas quando ?status=OVERDUE', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    const cobrancasVencidas = [
      { id: 'c-1', orgId: 'org-abc', status: 'overdue', valor: '1000', clienteNome: 'João' },
    ];
    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(cobrancasVencidas),
        }),
      }),
    });

    const res = await GET(makeGetRequest('?status=OVERDUE'));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cobrancas).toHaveLength(1);
    expect(json.cobrancas[0].status).toBe('overdue');
  });

  it('retorna 400 para status inválido', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await GET(makeGetRequest('?status=INVALIDO'));

    expect(res.status).toBe(400);
  });

  it('retorna lista de cobranças sem filtros', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    const todasCobrancas = [
      { id: 'c-1', status: 'pending' },
      { id: 'c-2', status: 'received' },
    ];
    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(todasCobrancas),
        }),
      }),
    });

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cobrancas).toHaveLength(2);
  });
});
