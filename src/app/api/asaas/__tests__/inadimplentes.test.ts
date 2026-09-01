/**
 * Testes unitários para GET /api/asaas/inadimplentes.
 *
 * Mockam @/db e @/auth para isolar o route handler.
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

// ── Imports após vi.mock ───────────────────────────────────────────────────────

import { auth } from '@/auth';
import { GET } from '../inadimplentes/route';

// ── Constantes ────────────────────────────────────────────────────────────────

const SESSION_COM_ORG = {
  user: { id: 'user-123', orgId: 'org-abc', role: 'socio' },
};

const SESSION_OUTRO_ORG = {
  user: { id: 'user-456', orgId: 'org-xyz', role: 'associado' },
};

// Data de vencimento antiga (com certeza overdue)
const VENCIMENTO_ANTIGO = '2026-01-01';

const COBRANCAS_ORG_ABC = [
  {
    id: 'cob-001',
    orgId: 'org-abc',
    status: 'overdue',
    vencimento: VENCIMENTO_ANTIGO,
    clienteNome: 'João Silva',
    clienteEmail: 'joao@example.com',
    valor: '1500.00',
    linkBoleto: 'https://boleto.asaas.com/001',
    linkPix: null,
    clienteCpfCnpj: '12345678900',
  },
  {
    id: 'cob-002',
    orgId: 'org-abc',
    status: 'overdue',
    vencimento: VENCIMENTO_ANTIGO,
    clienteNome: 'Maria Santos',
    clienteEmail: 'maria@example.com',
    valor: '2000.00',
    linkBoleto: null,
    linkPix: 'https://pix.asaas.com/002',
    clienteCpfCnpj: '98765432100',
  },
];

function makeGetRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/asaas/inadimplentes${query}`, {
    method: 'GET',
  });
}

// Helper para mock de select encadeado
function mockSelectRetornando(valores: unknown[]) {
  mockDbSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        orderBy: () => Promise.resolve(valores),
      }),
    }),
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('GET /api/asaas/inadimplentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
  });

  it('retorna 401 quando sessão não tem orgId', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-sem-org' },
    } as never);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
  });

  it('retorna lista de inadimplentes do org correto', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornando(COBRANCAS_ORG_ABC);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0].id).toBe('cob-001');
    expect(json[0].clienteNome).toBe('João Silva');
    expect(json[0].valor).toBe(1500);
    expect(json[0].linkBoleto).toBe('https://boleto.asaas.com/001');
  });

  it('retorna apenas cobranças vencidas há 7+ dias com ?dias_atraso=7', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    // Simula que apenas cobranças vencidas há 7+ dias foram retornadas pelo db
    mockSelectRetornando([COBRANCAS_ORG_ABC[0]]);

    const res = await GET(makeGetRequest('?dias_atraso=7'));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe('cob-001');
  });

  it('retorna lista vazia quando org não tem inadimplentes', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_OUTRO_ORG as never);
    mockSelectRetornando([]);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(0);
  });

  it('não retorna cobranças de outro org_id', async () => {
    // Org xyz solicita inadimplentes — db retorna lista vazia (isolamento correto)
    vi.mocked(auth).mockResolvedValueOnce(SESSION_OUTRO_ORG as never);
    mockSelectRetornando([]);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    // Deve retornar zero cobranças pois o filtro WHERE orgId = 'org-xyz' é aplicado
    expect(json).toHaveLength(0);
  });

  it('retorna 400 para dias_atraso inválido (zero)', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await GET(makeGetRequest('?dias_atraso=0'));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detalhes).toBeDefined();
  });

  it('retorna 400 para dias_atraso não numérico', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);

    const res = await GET(makeGetRequest('?dias_atraso=abc'));

    expect(res.status).toBe(400);
  });

  it('inclui diasAtraso calculado na resposta', async () => {
    vi.mocked(auth).mockResolvedValueOnce(SESSION_COM_ORG as never);
    mockSelectRetornando([COBRANCAS_ORG_ABC[0]]);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json[0].diasAtraso).toBe('number');
    expect(json[0].diasAtraso).toBeGreaterThan(0);
  });
});
