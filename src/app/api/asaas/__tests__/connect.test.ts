/**
 * Testes unitários para POST /api/asaas/connect e GET /api/asaas/connect.
 *
 * Mockam @/db, @/auth e @/lib/asaas/client para isolar os route handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks estáticos (hoisted pelo Vite) ───────────────────────────────────────

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
    criarSubConta: vi.fn(),
  },
}));

// ── Imports após vi.mock ───────────────────────────────────────────────────────

import { auth } from '@/auth';
import { asaasClient } from '@/lib/asaas/client';
import { AsaasError } from '@/lib/asaas/errors';
import { POST, GET } from '../connect/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_COM_ORG = {
  user: { id: 'user-123', orgId: 'org-abc', role: 'socio' },
};

function makeRequest(body?: unknown, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost/api/asaas/connect', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function mockSelectRetorno(valor: unknown[]) {
  mockDbSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(valor),
      }),
    }),
  });
}

// ── Testes POST ───────────────────────────────────────────────────────────────

describe('POST /api/asaas/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ name: 'Escritório Teste', email: 'adv@test.com', cpfCnpj: '12345678900' }));

    expect(res.status).toBe(401);
  });

  it('retorna 409 quando org já tem sub-conta', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetorno([
      { asaasAccountId: 'acc-123', status: 'pending' },
    ]);

    const res = await POST(
      makeRequest({ name: 'Escritório Teste', email: 'adv@test.com', cpfCnpj: '12345678900' }),
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.asaasAccountId).toBe('acc-123');
  });

  it('retorna 400 quando clienteEmail (email) está faltando', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetorno([]); // sem sub-conta existente

    const res = await POST(
      makeRequest({ name: 'Escritório Teste', cpfCnpj: '12345678900' }), // falta email
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detalhes).toBeDefined();
    expect(json.detalhes.email).toBeDefined();
  });

  it('cria sub-conta com dados válidos e retorna 201', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetorno([]); // sem sub-conta existente
    vi.mocked(asaasClient.criarSubConta).mockResolvedValueOnce({
      asaasAccountId: 'asaas-new-123',
      apiKey: 'key-abc',
      onboardingUrl: 'https://onboarding.asaas.com/1',
      status: 'pending',
    });

    const res = await POST(
      makeRequest({
        name: 'Escritório Jurídico',
        email: 'adv@escritorio.com',
        cpfCnpj: '12.345.678/0001-90',
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.asaasAccountId).toBe('asaas-new-123');
    expect(json.status).toBe('pending');
    expect(asaasClient.criarSubConta).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-abc',
        name: 'Escritório Jurídico',
        email: 'adv@escritorio.com',
      }),
    );
  });

  it('retorna 422 quando o AsaasClient lança AsaasError', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetorno([]);
    vi.mocked(asaasClient.criarSubConta).mockRejectedValueOnce(
      new AsaasError('CPF/CNPJ inválido', 'invalid_cpfCnpj', 422),
    );

    const res = await POST(
      makeRequest({
        name: 'Escritório Teste',
        email: 'adv@test.com',
        cpfCnpj: '00000000000',
      }),
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('CPF/CNPJ inválido');
    expect(json.code).toBe('invalid_cpfCnpj');
  });
});

// ── Testes GET ────────────────────────────────────────────────────────────────

describe('GET /api/asaas/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('retorna status null quando org não tem sub-conta', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetorno([]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBeNull();
  });

  it('retorna dados da sub-conta quando existe', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetorno([
      {
        asaasAccountId: 'asaas-456',
        status: 'active',
        onboardingUrl: null,
        createdAt: new Date('2026-01-01'),
        activatedAt: new Date('2026-01-02'),
      },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.asaasAccountId).toBe('asaas-456');
    expect(json.status).toBe('active');
  });
});
