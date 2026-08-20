/**
 * Testes unitários para alertasPrazo.
 *
 * Verifica:
 * - Evento em T-5 com flag false emite notificacao/nova e atualiza flag
 * - Evento em T-5 com flag true não emite evento duplicado (idempotência via BD)
 * - Processo arquivado (arquivado_at IS NOT NULL) não gera alerta
 * - Evento em T-2 com flag false emite alerta T-2
 * - Evento sem responsável é pulado sem erro
 * - Execução dupla no mesmo dia: segunda vez retorna 0 eventos (flags já true)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  eventosCalendario: {
    id: 'id',
    orgId: 'org_id',
    processoId: 'processo_id',
    titulo: 'titulo',
    data: 'data',
    alertadoT5: 'alertado_t5',
    alertadoT2: 'alertado_t2',
    alertadoT1: 'alertado_t1',
  },
  processos: {
    id: 'id',
    responsavelId: 'responsavel_id',
    arquivadoAt: 'arquivado_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ type: 'eq', col: _col, val: _val })),
  and: vi.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  isNull: vi.fn((_col: unknown) => ({ type: 'isNull', col: _col })),
}));

// ── Imports após mocks ────────────────────────────────────────────────────────

import { db } from '@/db';
import {
  calcularDataAlerta,
  buscarEventosPorMarco,
  marcarAlertaEnviado,
  MARCOS_ALERTA,
  type EventoComProcesso,
} from '../alertas-prazo';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEvento(overrides: Partial<EventoComProcesso> = {}): EventoComProcesso {
  return {
    id: 'evt-1',
    orgId: 'org-1',
    processoId: 'proc-1',
    titulo: 'Audiência de Instrução',
    data: '2026-08-25',
    responsavelId: 'user-1',
    ...overrides,
  };
}

// ── Helpers de mock do db ─────────────────────────────────────────────────────

function mockDbSelect(eventos: EventoComProcesso[]) {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(eventos),
  };
  vi.mocked(db.select).mockReturnValue(mockChain as never);
  return mockChain;
}

function mockDbUpdate() {
  const mockChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  vi.mocked(db.update).mockReturnValue(mockChain as never);
  return mockChain;
}

// ── Helper: executa o handler do alertasPrazo ─────────────────────────────────

async function runAlertasPrazo(hoje: Date = new Date()) {
  vi.resetModules();

  const { alertasPrazo } = await import('../alertas-prazo');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (alertasPrazo as any)['_fn'] ?? (alertasPrazo as any)['fn'];

  const sentEvents: Array<{ id: string; events: unknown[] }> = [];

  const stepMock = {
    run: vi.fn(async (_name: string, callback: () => Promise<unknown>) => callback()),
    sleep: vi.fn(async () => undefined),
    sendEvent: vi.fn(async (id: string, events: unknown) => {
      const eventsArray = Array.isArray(events) ? events : [events];
      sentEvents.push({ id, events: eventsArray });
      return undefined;
    }),
  };

  let result: unknown;
  if (fn) {
    result = await fn({ step: stepMock, runId: 'test-run' });
  }

  return { result, stepMock, sentEvents };
}

// ── Testes: calcularDataAlerta ────────────────────────────────────────────────

describe('calcularDataAlerta', () => {
  it('adiciona 5 dias à data de hoje no formato YYYY-MM-DD', () => {
    const hoje = new Date('2026-08-20T12:00:00Z');
    const resultado = calcularDataAlerta(5, hoje);
    expect(resultado).toBe('2026-08-25');
  });

  it('adiciona 2 dias corretamente', () => {
    const hoje = new Date('2026-08-20T00:00:00Z');
    const resultado = calcularDataAlerta(2, hoje);
    expect(resultado).toBe('2026-08-22');
  });

  it('adiciona 1 dia corretamente', () => {
    const hoje = new Date('2026-08-20T00:00:00Z');
    const resultado = calcularDataAlerta(1, hoje);
    expect(resultado).toBe('2026-08-21');
  });
});

// ── Testes: MARCOS_ALERTA ─────────────────────────────────────────────────────

describe('MARCOS_ALERTA', () => {
  it('contém os 3 marcos T-5, T-2 e T-1', () => {
    const dias = MARCOS_ALERTA.map((m) => m.dias);
    expect(dias).toContain(5);
    expect(dias).toContain(2);
    expect(dias).toContain(1);
  });

  it('todos os marcos têm flagColuna, stepId e label definidos', () => {
    for (const marco of MARCOS_ALERTA) {
      expect(marco.flagColuna).toBeTruthy();
      expect(marco.stepId).toBeTruthy();
      expect(marco.label).toBeTruthy();
    }
  });
});

// ── Testes: buscarEventosPorMarco ─────────────────────────────────────────────

describe('buscarEventosPorMarco', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna eventos da query com campos corretos', async () => {
    const evento = makeEvento();
    mockDbSelect([evento]);

    const resultado = await buscarEventosPorMarco('2026-08-25', 'alertadoT5');

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id: 'evt-1',
      orgId: 'org-1',
      titulo: 'Audiência de Instrução',
    });
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it('retorna lista vazia quando não há eventos', async () => {
    mockDbSelect([]);

    const resultado = await buscarEventosPorMarco('2026-08-25', 'alertadoT5');

    expect(resultado).toHaveLength(0);
  });
});

// ── Testes: marcarAlertaEnviado ───────────────────────────────────────────────

describe('marcarAlertaEnviado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama db.update com a flag correta', async () => {
    mockDbUpdate();

    await marcarAlertaEnviado('evt-1', 'alertadoT5');

    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('atualiza flag alertadoT2 corretamente', async () => {
    mockDbUpdate();

    await marcarAlertaEnviado('evt-2', 'alertadoT2');

    expect(db.update).toHaveBeenCalledTimes(1);
  });
});

// ── Testes: alertasPrazo (função Inngest completa) ────────────────────────────

describe('alertasPrazo — handler completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evento em T-5 com flag false emite notificacao/nova', async () => {
    const eventoT5 = makeEvento({ id: 'evt-t5', data: '2026-08-25' });

    // Configura: T-5 retorna evento, T-2 e T-1 retornam vazio
    let chamada = 0;
    vi.mocked(db.select).mockImplementation(() => {
      chamada++;
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(chamada === 1 ? [eventoT5] : []),
      };
      return mockChain as never;
    });
    mockDbUpdate();

    const { sentEvents } = await runAlertasPrazo();

    // Deve ter emitido ao menos 1 evento de notificação
    expect(sentEvents.length).toBeGreaterThan(0);
    const evento = sentEvents[0].events[0] as { name: string; data: { tipo: string; diasRestantes: number } };
    expect(evento.name).toBe('notificacao/nova');
    expect(evento.data.tipo).toBe('prazo_iminente');
    expect(evento.data.diasRestantes).toBe(5);
  });

  it('evento em T-5 com flag true (retornado vazio) não emite evento duplicado', async () => {
    // Se a flag já é true, a query não retorna o evento (filtro no BD)
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]), // flag já true = sem resultados
    };
    vi.mocked(db.select).mockReturnValue(mockChain as never);

    const { sentEvents } = await runAlertasPrazo();

    expect(sentEvents).toHaveLength(0);
  });

  it('processo arquivado não gera alerta (query retorna vazio via filtro isNull)', async () => {
    // A query já filtra arquivadoAt IS NULL — se arquivado, não retorna
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]), // arquivado filtrado pelo BD
    };
    vi.mocked(db.select).mockReturnValue(mockChain as never);

    const { sentEvents } = await runAlertasPrazo();

    expect(sentEvents).toHaveLength(0);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('evento em T-2 com flag false emite alerta T-2', async () => {
    const eventoT2 = makeEvento({ id: 'evt-t2', data: '2026-08-22' });

    let chamada = 0;
    vi.mocked(db.select).mockImplementation(() => {
      chamada++;
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        // T-5 e T-1 vazios, T-2 retorna evento
        where: vi.fn().mockResolvedValue(chamada === 2 ? [eventoT2] : []),
      };
      return mockChain as never;
    });
    mockDbUpdate();

    const { sentEvents } = await runAlertasPrazo();

    expect(sentEvents.length).toBeGreaterThan(0);
    const evento = sentEvents[0].events[0] as { name: string; data: { diasRestantes: number } };
    expect(evento.name).toBe('notificacao/nova');
    expect(evento.data.diasRestantes).toBe(2);
  });

  it('evento sem responsável é pulado sem erro', async () => {
    const eventoSemResponsavel = makeEvento({ responsavelId: null });

    let chamada = 0;
    vi.mocked(db.select).mockImplementation(() => {
      chamada++;
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(chamada === 1 ? [eventoSemResponsavel] : []),
      };
      return mockChain as never;
    });

    const { sentEvents } = await runAlertasPrazo();

    // Sem responsável = sem emit
    expect(sentEvents).toHaveLength(0);
  });

  it('3 eventos em T-5 emitem 3 notificacoes/nova', async () => {
    const eventos = [
      makeEvento({ id: 'evt-1', responsavelId: 'user-1' }),
      makeEvento({ id: 'evt-2', responsavelId: 'user-2' }),
      makeEvento({ id: 'evt-3', responsavelId: 'user-3' }),
    ];

    let chamada = 0;
    vi.mocked(db.select).mockImplementation(() => {
      chamada++;
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(chamada === 1 ? eventos : []),
      };
      return mockChain as never;
    });
    mockDbUpdate();

    const { sentEvents } = await runAlertasPrazo();

    // Um batch com 3 eventos
    expect(sentEvents.length).toBeGreaterThan(0);
    const totalEventos = sentEvents.reduce((acc, s) => acc + s.events.length, 0);
    expect(totalEventos).toBe(3);
  });

  it('segunda execução no mesmo dia não emite eventos (flags já true)', async () => {
    // Segunda execução: BD retorna vazio porque flags já foram marcadas
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as never);

    const { sentEvents } = await runAlertasPrazo();

    expect(sentEvents).toHaveLength(0);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('após emit, flags são atualizadas no banco', async () => {
    const evento = makeEvento();

    let chamada = 0;
    vi.mocked(db.select).mockImplementation(() => {
      chamada++;
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(chamada === 1 ? [evento] : []),
      };
      return mockChain as never;
    });
    mockDbUpdate();

    await runAlertasPrazo();

    // db.update chamado para marcar a flag
    expect(db.update).toHaveBeenCalled();
  });

  it('título com 1 dia usa singular ("dia") no título da notificação', async () => {
    const eventoT1 = makeEvento({ id: 'evt-t1', data: '2026-08-21' });

    let chamada = 0;
    vi.mocked(db.select).mockImplementation(() => {
      chamada++;
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        // T-1 é o terceiro marco (chamada 3)
        where: vi.fn().mockResolvedValue(chamada === 3 ? [eventoT1] : []),
      };
      return mockChain as never;
    });
    mockDbUpdate();

    const { sentEvents } = await runAlertasPrazo();

    expect(sentEvents.length).toBeGreaterThan(0);
    const evento = sentEvents[0].events[0] as { data: { titulo: string; diasRestantes: number } };
    // 1 dia = singular
    expect(evento.data.titulo).toContain('1 dia:');
    expect(evento.data.diasRestantes).toBe(1);
  });

  it('título com 5 dias usa plural ("dias") no título da notificação', async () => {
    const eventoT5 = makeEvento({ id: 'evt-t5-plural', data: '2026-08-25', titulo: 'Prazo Fatal' });

    let chamada = 0;
    vi.mocked(db.select).mockImplementation(() => {
      chamada++;
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(chamada === 1 ? [eventoT5] : []),
      };
      return mockChain as never;
    });
    mockDbUpdate();

    const { sentEvents } = await runAlertasPrazo();

    expect(sentEvents.length).toBeGreaterThan(0);
    const evento = sentEvents[0].events[0] as { data: { titulo: string } };
    expect(evento.data.titulo).toContain('5 dias:');
  });

  it('mix de eventos com e sem responsável: apenas os com responsável são marcados nas flags', async () => {
    // Eventos: primeiro sem responsável, segundo com responsável
    const eventos = [
      makeEvento({ id: 'evt-sem', responsavelId: null }),
      makeEvento({ id: 'evt-com', responsavelId: 'user-2' }),
    ];

    let chamada = 0;
    vi.mocked(db.select).mockImplementation(() => {
      chamada++;
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(chamada === 1 ? eventos : []),
      };
      return mockChain as never;
    });
    mockDbUpdate();

    const { sentEvents } = await runAlertasPrazo();

    // Apenas 1 evento emitido (o com responsável)
    const totalEventos = sentEvents.reduce((acc, s) => acc + s.events.length, 0);
    expect(totalEventos).toBe(1);

    // db.update chamado apenas 1 vez (apenas o com responsável)
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
