/**
 * Testes unitários para os endpoints de calendário (Task 21).
 *
 * Verifica:
 * - GET /api/calendario/eventos valida parâmetros obrigatórios
 * - PUT /api/calendario/eventos/[id] retorna 422 para prazo_fatal em data passada
 * - PUT roteia corretamente por fonte
 * - DELETE roteia corretamente por fonte
 * - GET /api/calendario/foco-do-dia retorna eventos do dia
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    execute: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/org-context', () => ({
  requireOrgContext: vi.fn().mockResolvedValue({ orgId: 'org-test-1', userId: 'user-1' }),
}));

vi.mock('@/lib/errors', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'UnauthorizedError';
    }
  },
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { db } from '@/db';
import { GET as getEventos, POST as postEvento } from '@/app/api/calendario/eventos/route';
import { PUT as putEvento, DELETE as deleteEvento } from '@/app/api/calendario/eventos/[id]/route';
import { GET as getFocoDoDia } from '@/app/api/calendario/foco-do-dia/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(url, options);
}

function makeUpdateChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { update: vi.fn().mockReturnValue({ set }) };
}

function makeDeleteChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const where = vi.fn().mockReturnValue({ returning });
  return { delete: vi.fn().mockReturnValue({ where }) };
}

function makeInsertChain(returnValue: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returnValue);
  const values = vi.fn().mockReturnValue({ returning });
  return { insert: vi.fn().mockReturnValue({ values }) };
}

// ── GET /api/calendario/eventos ───────────────────────────────────────────────

describe('GET /api/calendario/eventos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 400 quando start está ausente', async () => {
    const req = makeRequest('http://localhost/api/calendario/eventos?end=2026-10-31');
    const res = await getEventos(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('start');
  });

  it('retorna 400 quando end está ausente', async () => {
    const req = makeRequest('http://localhost/api/calendario/eventos?start=2026-10-01');
    const res = await getEventos(req);
    expect(res.status).toBe(400);
  });

  it('retorna 200 com eventos quando start e end presentes', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({
      rows: [
        { id: 'ev-1', tipo: 'audiencia', fonte: 'calendario', data: '2026-10-10' },
        { id: 'ev-2', tipo: 'tarefa', fonte: 'agenda', data: '2026-10-15' },
      ],
    } as Awaited<ReturnType<typeof db.execute>>);

    const req = makeRequest(
      'http://localhost/api/calendario/eventos?start=2026-10-01&end=2026-10-31',
    );
    const res = await getEventos(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.data[0].fonte).toBe('calendario');
    expect(json.data[1].fonte).toBe('agenda');
  });
});

// ── POST /api/calendario/eventos ──────────────────────────────────────────────

describe('POST /api/calendario/eventos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('insere em eventos_agenda quando processoId ausente', async () => {
    const chain = makeInsertChain([{ id: 'ev-3', fonte: 'agenda' }]);
    vi.mocked(db.insert).mockImplementation(chain.insert as unknown as typeof db.insert);

    const req = makeRequest('http://localhost/api/calendario/eventos', {
      method: 'POST',
      body: JSON.stringify({ titulo: 'Reunião', data: '2026-10-20', tipo: 'tarefa' }),
    });
    const res = await postEvento(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.fonte).toBe('agenda');
  });

  it('insere em eventos_calendario quando processoId presente', async () => {
    const chain = makeInsertChain([{ id: 'ev-4', processoId: 'proc-1' }]);
    vi.mocked(db.insert).mockImplementation(chain.insert as unknown as typeof db.insert);

    const req = makeRequest('http://localhost/api/calendario/eventos', {
      method: 'POST',
      body: JSON.stringify({
        titulo: 'Audiência',
        data: '2026-11-05',
        tipo: 'audiencia',
        processoId: 'proc-uuid-1',
      }),
    });
    const res = await postEvento(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.fonte).toBe('calendario');
  });

  it('retorna 400 quando titulo está ausente', async () => {
    const req = makeRequest('http://localhost/api/calendario/eventos', {
      method: 'POST',
      body: JSON.stringify({ data: '2026-10-20' }),
    });
    const res = await postEvento(req);
    expect(res.status).toBe(400);
  });

  it('retorna 400 quando data tem formato inválido', async () => {
    const req = makeRequest('http://localhost/api/calendario/eventos', {
      method: 'POST',
      body: JSON.stringify({ titulo: 'Reunião', data: '20/10/2026' }),
    });
    const res = await postEvento(req);
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/calendario/eventos/[id] ─────────────────────────────────────────

describe('PUT /api/calendario/eventos/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const params = Promise.resolve({ id: 'ev-uuid-1' });

  it('retorna 422 para prazo_fatal movido para data passada', async () => {
    const req = makeRequest('http://localhost/api/calendario/eventos/ev-uuid-1', {
      method: 'PUT',
      body: JSON.stringify({ fonte: 'calendario', tipo: 'prazo_fatal', data: '2020-01-01' }),
    });
    const res = await putEvento(req, { params });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('Prazo fatal não pode ser movido para data passada.');
  });

  it('retorna 400 quando fonte está ausente', async () => {
    const req = makeRequest('http://localhost/api/calendario/eventos/ev-uuid-1', {
      method: 'PUT',
      body: JSON.stringify({ tipo: 'audiencia', data: '2026-12-01' }),
    });
    const res = await putEvento(req, { params });
    expect(res.status).toBe(400);
  });

  it('atualiza eventos_calendario quando fonte=calendario', async () => {
    const chain = makeUpdateChain([{ id: 'ev-uuid-1' }]);
    vi.mocked(db.update).mockImplementation(chain.update as unknown as typeof db.update);

    const req = makeRequest('http://localhost/api/calendario/eventos/ev-uuid-1', {
      method: 'PUT',
      body: JSON.stringify({ fonte: 'calendario', titulo: 'Novo Título', data: '2026-12-01' }),
    });
    const res = await putEvento(req, { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fonte).toBe('calendario');
    expect(db.update).toHaveBeenCalled();
  });

  it('atualiza eventos_agenda quando fonte=agenda', async () => {
    const chain = makeUpdateChain([{ id: 'ev-uuid-1' }]);
    vi.mocked(db.update).mockImplementation(chain.update as unknown as typeof db.update);

    const req = makeRequest('http://localhost/api/calendario/eventos/ev-uuid-1', {
      method: 'PUT',
      body: JSON.stringify({ fonte: 'agenda', titulo: 'Reunião atualizada' }),
    });
    const res = await putEvento(req, { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fonte).toBe('agenda');
  });

  it('retorna 404 quando evento não pertence ao org_id', async () => {
    const chain = makeUpdateChain([]);
    vi.mocked(db.update).mockImplementation(chain.update as unknown as typeof db.update);

    const req = makeRequest('http://localhost/api/calendario/eventos/outro-org-ev', {
      method: 'PUT',
      body: JSON.stringify({ fonte: 'calendario', titulo: 'Inválido' }),
    });
    const res = await putEvento(req, { params: Promise.resolve({ id: 'outro-org-ev' }) });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/calendario/eventos/[id] ──────────────────────────────────────

describe('DELETE /api/calendario/eventos/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const params = Promise.resolve({ id: 'ev-uuid-del' });

  it('deleta de eventos_agenda quando fonte=agenda', async () => {
    const chain = makeDeleteChain([{ id: 'ev-uuid-del' }]);
    vi.mocked(db.delete).mockImplementation(chain.delete as unknown as typeof db.delete);

    const req = makeRequest(
      'http://localhost/api/calendario/eventos/ev-uuid-del?fonte=agenda',
    );
    const res = await deleteEvento(req, { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('deleta de eventos_calendario quando fonte=calendario', async () => {
    const chain = makeDeleteChain([{ id: 'ev-uuid-del' }]);
    vi.mocked(db.delete).mockImplementation(chain.delete as unknown as typeof db.delete);

    const req = makeRequest(
      'http://localhost/api/calendario/eventos/ev-uuid-del?fonte=calendario',
    );
    const res = await deleteEvento(req, { params });
    expect(res.status).toBe(200);
    expect(db.delete).toHaveBeenCalled();
  });

  it('retorna 404 quando evento não encontrado', async () => {
    const chain = makeDeleteChain([]);
    vi.mocked(db.delete).mockImplementation(chain.delete as unknown as typeof db.delete);

    const req = makeRequest(
      'http://localhost/api/calendario/eventos/inexistente?fonte=agenda',
    );
    const res = await deleteEvento(req, { params: Promise.resolve({ id: 'inexistente' }) });
    expect(res.status).toBe(404);
  });
});

// ── GET /api/calendario/foco-do-dia ──────────────────────────────────────────

describe('GET /api/calendario/foco-do-dia', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna eventos do dia atual com campo date', async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    vi.mocked(db.execute).mockResolvedValueOnce({
      rows: [{ id: 'ev-today', data: hoje, tipo: 'tarefa', fonte: 'agenda' }],
    } as Awaited<ReturnType<typeof db.execute>>);

    const res = await getFocoDoDia();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.date).toBe(hoje);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].data).toBe(hoje);
  });

  it('retorna lista vazia quando não há eventos hoje', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({
      rows: [],
    } as Awaited<ReturnType<typeof db.execute>>);

    const res = await getFocoDoDia();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });
});
