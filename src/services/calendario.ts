/**
 * Service de calendário processual do JurisRadar SaaS.
 *
 * Fornece queries de eventos por período (isoladas por org_id — ADR-002)
 * e geração de string iCal RFC 5545.
 */

import { db } from '@/db'
import { eventosCalendario, processos, movimentacoes } from '@/db/schema'
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm'
import type { OrgContext } from '@/types/domain'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type TipoEvento = 'prazo_fatal' | 'audiencia' | 'intimacao' | 'prazo' | string

export interface EventoCalendarioItem {
  id: string
  processoId: string
  numeroCnj: string
  tribunal?: string | null
  tipo: TipoEvento
  titulo: string
  data: string // YYYY-MM-DD
}

// ── Cores por tipo/urgência ────────────────────────────────────────────────────

/**
 * Retorna a cor hexadecimal de um evento com base no tipo e dias restantes.
 *
 * Regras:
 * - audiencia: azul (#2563eb) — independe de prazo
 * - intimacao: roxo (#7c3aed) — sem prazo fatal
 * - prazo_fatal ou prazo ≤ 2 dias: vermelho (#dc2626)
 * - prazo 3–7 dias: laranja (#ea580c)
 * - prazo > 7 dias: cinza (#6b7280)
 */
export function resolverCorEvento(tipo: TipoEvento, data: string): string {
  if (tipo === 'audiencia') return '#2563eb'
  if (tipo === 'intimacao') return '#7c3aed'

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dataEvento = new Date(data + 'T00:00:00')
  const diffMs = dataEvento.getTime() - hoje.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (tipo === 'prazo_fatal' || diffDias <= 2) return '#dc2626'
  if (diffDias <= 7) return '#ea580c'
  return '#6b7280'
}

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * Retorna eventos de calendário do período para a organização do contexto.
 * Inclui join com processos para obter numero_cnj e tribunal.
 */
export async function getEventosByPeriod(
  ctx: OrgContext,
  de: string,
  ate: string,
): Promise<EventoCalendarioItem[]> {
  // 1. Eventos explícitos da tabela eventos_calendario
  const eventoRows = await db
    .select({
      id: eventosCalendario.id,
      processoId: eventosCalendario.processoId,
      tipo: eventosCalendario.tipo,
      titulo: eventosCalendario.titulo,
      data: eventosCalendario.data,
      numeroCnj: processos.numeroCnj,
      tribunal: processos.tribunal,
    })
    .from(eventosCalendario)
    .innerJoin(processos, eq(eventosCalendario.processoId, processos.id))
    .where(
      and(
        eq(eventosCalendario.orgId, ctx.orgId),
        gte(eventosCalendario.data, de),
        lte(eventosCalendario.data, ate),
      ),
    )
    .orderBy(eventosCalendario.data)

  // Tipos de movimentação relevantes para o calendário — editais e intimações
  // são publicações informativas do DJEN e não devem poluir a agenda.
  const TIPOS_CALENDARIO = ['audiencia', 'prazo', 'prazo_fatal', 'sessao', 'julgamento']

  // 2. Movimentações processuais do período como eventos de agenda
  const movRows = await db
    .select({
      id: movimentacoes.id,
      processoId: movimentacoes.processoId,
      tipo: movimentacoes.tipo,
      descricao: movimentacoes.descricao,
      data: sql<string>`to_char(${movimentacoes.data}, 'YYYY-MM-DD')`,
      numeroCnj: processos.numeroCnj,
      tribunal: processos.tribunal,
    })
    .from(movimentacoes)
    .innerJoin(processos, eq(movimentacoes.processoId, processos.id))
    .where(
      and(
        eq(movimentacoes.orgId, ctx.orgId),
        gte(movimentacoes.data, new Date(de + 'T00:00:00')),
        lte(movimentacoes.data, new Date(ate + 'T23:59:59')),
        inArray(movimentacoes.tipo, TIPOS_CALENDARIO),
      ),
    )
    .orderBy(movimentacoes.data)
    .limit(200)

  const eventoIds = new Set(eventoRows.map((r) => r.processoId + ':' + r.data))

  const movEventos: EventoCalendarioItem[] = movRows
    .filter((r) => !eventoIds.has(r.processoId + ':' + r.data))
    .map((r) => ({
      id: r.id,
      processoId: r.processoId,
      numeroCnj: r.numeroCnj,
      tribunal: r.tribunal,
      tipo: r.tipo ?? 'movimentacao',
      titulo: r.tipo
        ? `${r.tipo}: ${r.descricao.slice(0, 60)}`
        : r.descricao.slice(0, 80),
      data: r.data,
    }))

  const eventosExplicitos: EventoCalendarioItem[] = eventoRows.map((r) => ({
    id: r.id,
    processoId: r.processoId,
    numeroCnj: r.numeroCnj,
    tribunal: r.tribunal,
    tipo: r.tipo,
    titulo: r.titulo,
    data: r.data,
  }))

  return [...eventosExplicitos, ...movEventos].sort((a, b) => a.data.localeCompare(b.data))
}

// ── Geração iCal RFC 5545 ──────────────────────────────────────────────────────

/**
 * Escapa caracteres especiais de propriedades TEXT no iCal.
 */
function escapeIcal(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Converte data no formato YYYY-MM-DD para YYYYMMDD (iCal DATE value).
 */
function formatIcalDate(date: string): string {
  return date.replace(/-/g, '')
}

/**
 * Gera timestamp UTC atual no formato iCal (YYYYMMDDTHHmmssZ).
 */
function nowIcalTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Gera string iCal válida (RFC 5545) para uma lista de eventos de calendário.
 *
 * Cada evento vira um VEVENT com:
 * - UID único
 * - SUMMARY com título
 * - DTSTART com data do evento (all-day)
 * - DTEND = DTSTART + 1 dia
 * - DESCRIPTION com número CNJ e tipo
 */
export function gerarIcal(eventos: EventoCalendarioItem[]): string {
  const dtstamp = nowIcalTimestamp()

  const vevents = eventos.map((ev) => {
    const dtstart = formatIcalDate(ev.data)
    // Para eventos all-day, DTEND é o dia seguinte
    const nextDay = new Date(ev.data + 'T00:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    const dtend = nextDay.toISOString().slice(0, 10).replace(/-/g, '')

    const description = escapeIcal(
      `Processo: ${ev.numeroCnj}${ev.tribunal ? ` — ${ev.tribunal}` : ''}\nTipo: ${ev.tipo}`,
    )
    const summary = escapeIcal(ev.titulo)

    return [
      'BEGIN:VEVENT',
      `UID:jurisradar-${ev.id}@jurisradar.com.br`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `CATEGORIES:${escapeIcal(ev.tipo.toUpperCase())}`,
      'END:VEVENT',
    ].join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JurisRadar//Calendário Processual//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:JurisRadar — Calendário Processual',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')
}
