/**
 * Testes unitários para src/services/calendario.ts
 *
 * Cobre:
 * - gerarIcal: geração de string iCal RFC 5545
 * - resolverCorEvento: cores por tipo e urgência
 * - getEventosByPeriod: isolamento multi-tenant por org_id
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('@/db/schema', () => ({
  eventosCalendario: {
    id: 'id',
    orgId: 'org_id',
    processoId: 'processo_id',
    tipo: 'tipo',
    titulo: 'titulo',
    data: 'data',
  },
  processos: {
    id: 'id',
    numeroCnj: 'numero_cnj',
    tribunal: 'tribunal',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, val) => ({ type: 'eq', field, val })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  gte: vi.fn((field, val) => ({ type: 'gte', field, val })),
  lte: vi.fn((field, val) => ({ type: 'lte', field, val })),
}))

// ── Imports (após os mocks) ────────────────────────────────────────────────────

import { gerarIcal, resolverCorEvento, getEventosByPeriod } from '../calendario'
import type { EventoCalendarioItem } from '../calendario'
import { db } from '@/db'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCtx(
  overrides: Partial<{ orgId: string; userId: string; role: 'socio' | 'associado' | 'estagiario' }> = {},
) {
  return { orgId: 'org-a', userId: 'user-1', role: 'socio' as const, ...overrides }
}

function makeEvento(overrides: Partial<EventoCalendarioItem> = {}): EventoCalendarioItem {
  return {
    id: 'ev-1',
    processoId: 'proc-1',
    numeroCnj: '0001234-56.2026.8.26.0001',
    tribunal: 'TJSP',
    tipo: 'prazo',
    titulo: 'Prazo petição',
    data: '2026-09-01',
    ...overrides,
  }
}

// ── Testes: gerarIcal ──────────────────────────────────────────────────────────

describe('gerarIcal', () => {
  it('retorna string com BEGIN:VCALENDAR e END:VCALENDAR', () => {
    const ical = gerarIcal([makeEvento()])
    expect(ical).toContain('BEGIN:VCALENDAR')
    expect(ical).toContain('END:VCALENDAR')
  })

  it('contém DTSTART:20260901 para data 2026-09-01', () => {
    const ical = gerarIcal([makeEvento({ data: '2026-09-01' })])
    expect(ical).toContain('DTSTART;VALUE=DATE:20260901')
  })

  it('contém DTEND = dia seguinte (20260902) para evento de um dia', () => {
    const ical = gerarIcal([makeEvento({ data: '2026-09-01' })])
    expect(ical).toContain('DTEND;VALUE=DATE:20260902')
  })

  it('contém BEGIN:VEVENT e END:VEVENT para cada evento', () => {
    const eventos = [makeEvento({ id: 'ev-1' }), makeEvento({ id: 'ev-2', data: '2026-09-15' })]
    const ical = gerarIcal(eventos)
    const beginCount = (ical.match(/BEGIN:VEVENT/g) ?? []).length
    const endCount = (ical.match(/END:VEVENT/g) ?? []).length
    expect(beginCount).toBe(2)
    expect(endCount).toBe(2)
  })

  it('contém SUMMARY com o título do evento', () => {
    const ical = gerarIcal([makeEvento({ titulo: 'Prazo petição' })])
    expect(ical).toContain('SUMMARY:Prazo petição')
  })

  it('contém UID único baseado no id do evento', () => {
    const ical = gerarIcal([makeEvento({ id: 'ev-xyz' })])
    expect(ical).toContain('UID:jurisradar-ev-xyz@jurisradar.com.br')
  })

  it('retorna string válida com VERSION:2.0 e PRODID', () => {
    const ical = gerarIcal([makeEvento()])
    expect(ical).toContain('VERSION:2.0')
    expect(ical).toContain('PRODID:-//JurisRadar//Calendário Processual//PT')
  })

  it('retorna calendário vazio (sem VEVENT) para lista vazia', () => {
    const ical = gerarIcal([])
    expect(ical).toContain('BEGIN:VCALENDAR')
    expect(ical).toContain('END:VCALENDAR')
    expect(ical).not.toContain('BEGIN:VEVENT')
  })

  it('escapa caracteres especiais no título', () => {
    const ical = gerarIcal([makeEvento({ titulo: 'Prazo; Resposta, do Réu' })])
    expect(ical).toContain('SUMMARY:Prazo\\; Resposta\\, do Réu')
  })
})

// ── Testes: resolverCorEvento ──────────────────────────────────────────────────

describe('resolverCorEvento', () => {
  it('retorna azul para tipo audiencia independentemente da data', () => {
    const cor = resolverCorEvento('audiencia', '2099-12-31')
    expect(cor).toBe('#2563eb')
  })

  it('retorna azul para tipo audiencia mesmo em data passada', () => {
    const cor = resolverCorEvento('audiencia', '2020-01-01')
    expect(cor).toBe('#2563eb')
  })

  it('retorna roxo para tipo intimacao independentemente da data', () => {
    const cor = resolverCorEvento('intimacao', '2099-12-31')
    expect(cor).toBe('#7c3aed')
  })

  it('retorna vermelho para prazo_fatal independentemente da data', () => {
    const cor = resolverCorEvento('prazo_fatal', '2099-12-31')
    expect(cor).toBe('#dc2626')
  })

  it('retorna vermelho para prazo ≤ 2 dias no futuro', () => {
    // Data de hoje + 1 dia
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const data = amanha.toISOString().slice(0, 10)
    const cor = resolverCorEvento('prazo', data)
    expect(cor).toBe('#dc2626')
  })

  it('retorna vermelho para prazo na data de hoje (0 dias)', () => {
    const hoje = new Date().toISOString().slice(0, 10)
    const cor = resolverCorEvento('prazo', hoje)
    expect(cor).toBe('#dc2626')
  })

  it('retorna laranja para prazo entre 3 e 7 dias', () => {
    const daqui5dias = new Date()
    daqui5dias.setDate(daqui5dias.getDate() + 5)
    const data = daqui5dias.toISOString().slice(0, 10)
    const cor = resolverCorEvento('prazo', data)
    expect(cor).toBe('#ea580c')
  })

  it('retorna cinza para prazo > 7 dias', () => {
    const daqui30dias = new Date()
    daqui30dias.setDate(daqui30dias.getDate() + 30)
    const data = daqui30dias.toISOString().slice(0, 10)
    const cor = resolverCorEvento('prazo', data)
    expect(cor).toBe('#6b7280')
  })
})

// ── Testes: getEventosByPeriod ─────────────────────────────────────────────────

describe('getEventosByPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna apenas eventos do org do contexto', async () => {
    // Simula o encadeamento db.select().from().innerJoin().where().orderBy()
    const mockRows = [
      {
        id: 'ev-1',
        processoId: 'proc-1',
        tipo: 'prazo',
        titulo: 'Prazo petição',
        data: '2026-09-01',
        numeroCnj: '0001234-56.2026.8.26.0001',
        tribunal: 'TJSP',
      },
    ]

    const orderByMock = vi.fn().mockResolvedValue(mockRows)
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock })
    const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock })
    const fromMock = vi.fn().mockReturnValue({ innerJoin: innerJoinMock })
    const selectMock = vi.fn().mockReturnValue({ from: fromMock })

    vi.mocked(db.select).mockImplementation(selectMock as unknown as typeof db.select)

    const ctx = makeCtx({ orgId: 'org-a' })
    const eventos = await getEventosByPeriod(ctx, '2026-09-01', '2026-09-30')

    expect(eventos).toHaveLength(1)
    expect(eventos[0].id).toBe('ev-1')
    expect(eventos[0].numeroCnj).toBe('0001234-56.2026.8.26.0001')
    expect(eventos[0].tribunal).toBe('TJSP')
  })

  it('retorna lista vazia quando não há eventos no período', async () => {
    const orderByMock = vi.fn().mockResolvedValue([])
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock })
    const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock })
    const fromMock = vi.fn().mockReturnValue({ innerJoin: innerJoinMock })
    const selectMock = vi.fn().mockReturnValue({ from: fromMock })

    vi.mocked(db.select).mockImplementation(selectMock as unknown as typeof db.select)

    const ctx = makeCtx()
    const eventos = await getEventosByPeriod(ctx, '2026-09-01', '2026-09-30')

    expect(eventos).toHaveLength(0)
  })

  it('mapeia corretamente os campos do banco para o tipo EventoCalendarioItem', async () => {
    const mockRows = [
      {
        id: 'ev-2',
        processoId: 'proc-2',
        tipo: 'audiencia',
        titulo: 'Audiência de instrução',
        data: '2026-09-15',
        numeroCnj: '9999999-99.2026.8.26.9999',
        tribunal: null,
      },
    ]

    const orderByMock = vi.fn().mockResolvedValue(mockRows)
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock })
    const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock })
    const fromMock = vi.fn().mockReturnValue({ innerJoin: innerJoinMock })
    const selectMock = vi.fn().mockReturnValue({ from: fromMock })

    vi.mocked(db.select).mockImplementation(selectMock as unknown as typeof db.select)

    const ctx = makeCtx()
    const eventos = await getEventosByPeriod(ctx, '2026-09-01', '2026-09-30')

    expect(eventos[0]).toMatchObject({
      id: 'ev-2',
      processoId: 'proc-2',
      tipo: 'audiencia',
      titulo: 'Audiência de instrução',
      data: '2026-09-15',
      numeroCnj: '9999999-99.2026.8.26.9999',
      tribunal: null,
    })
  })
})
