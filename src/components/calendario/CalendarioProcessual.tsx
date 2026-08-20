'use client';

/**
 * CalendarioProcessual — componente principal do calendário processual.
 *
 * Visualizações: month (mensal), week (semanal), agenda (lista).
 * Ao clicar em um evento, abre o ProcessoSheet com detalhes do processo.
 * Suporte a swipe horizontal no mobile para navegar entre semanas/meses.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventoCalendarioItem } from '@/services/calendario';
import { resolverCorEvento } from '@/services/calendario';
import { EventoCalendario } from './EventoCalendario';

// Configuração do localizador com date-fns + pt-BR
const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales,
});

// Mensagens em português
const messages = {
  allDay: 'Dia todo',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Sem eventos neste período.',
  showMore: (total: number) => `+${total} mais`,
};

// Tipo de evento para o react-big-calendar
export interface CalendarioEvento {
  id: string;
  title: string;
  start: Date;
  end: Date;
  tipo: string;
  data: string;
  processoId: string;
  numeroCnj?: string;
  tribunal?: string | null;
}

export interface CalendarioProcessualProps {
  eventos: EventoCalendarioItem[];
}

function mapEventos(eventos: EventoCalendarioItem[]): CalendarioEvento[] {
  return eventos.map((ev) => {
    const start = new Date(ev.data + 'T00:00:00');
    const end = new Date(ev.data + 'T23:59:59');
    return {
      id: ev.id,
      title: ev.titulo,
      start,
      end,
      tipo: ev.tipo,
      data: ev.data,
      processoId: ev.processoId,
      numeroCnj: ev.numeroCnj,
      tribunal: ev.tribunal,
    };
  });
}

export function CalendarioProcessual({ eventos }: CalendarioProcessualProps) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [eventoSelecionado, setEventoSelecionado] = useState<CalendarioEvento | null>(null);
  const [sheetAberta, setSheetAberta] = useState(false);
  const [processo, setProcesso] = useState<import('@/components/crm/ProcessoSheet').ProcessoDetalhe | null>(null);
  const [carregandoProcesso, setCarregandoProcesso] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  // Swipe horizontal para mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const eventosCalendario = mapEventos(eventos);

  // Estilo personalizado por evento (cor conforme tipo/urgência)
  const eventStyleGetter = useCallback((event: CalendarioEvento) => {
    const cor = resolverCorEvento(event.tipo, event.data);
    return {
      style: {
        backgroundColor: cor,
        borderColor: cor,
        color: '#fff',
        borderRadius: '0.25rem',
        border: 'none',
        padding: '0.125rem 0.375rem',
        fontSize: '0.75rem',
        cursor: 'pointer',
      },
    };
  }, []);

  // Clique em evento → buscar processo e abrir sheet
  const handleSelectEvent = useCallback(async (event: CalendarioEvento) => {
    setEventoSelecionado(event);
    setSheetAberta(true);
    setCarregandoProcesso(true);
    setProcesso(null);

    try {
      const res = await fetch(`/api/processos/${event.processoId}`);
      if (res.ok) {
        const json = await res.json();
        setProcesso(json.data ?? json);
      }
    } catch {
      // falha silenciosa — sheet abre sem dados completos
    } finally {
      setCarregandoProcesso(false);
    }
  }, []);

  // Swipe horizontal para mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      // Só conta como swipe horizontal se Δx > Δy (movimento predominantemente horizontal)
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

      if (deltaX < 0) {
        // Swipe para esquerda → avançar
        if (view === Views.MONTH) setDate((d) => addMonths(d, 1));
        else setDate((d) => addWeeks(d, 1));
      } else {
        // Swipe para direita → recuar
        if (view === Views.MONTH) setDate((d) => subMonths(d, 1));
        else setDate((d) => subWeeks(d, 1));
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [view],
  );

  // Lazy import do ProcessoSheet para evitar SSR
  const [ProcessoSheet, setProcessoSheet] =
    useState<React.ComponentType<import('@/components/crm/ProcessoSheet').ProcessoSheetProps> | null>(null);

  useEffect(() => {
    import('@/components/crm/ProcessoSheet').then((mod) => {
      setProcessoSheet(() => mod.ProcessoSheet);
    });
  }, []);

  return (
    <div
      ref={wrapperRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ height: '75vh', minHeight: 500, position: 'relative' }}
      data-testid="calendario-processual"
    >
      <Calendar
        localizer={localizer}
        events={eventosCalendario}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={(v) => setView(v)}
        date={date}
        onNavigate={(d) => setDate(d)}
        messages={messages}
        culture="pt-BR"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleSelectEvent}
        components={{
          event: (props) => (
            <EventoCalendario
              event={{
                title: props.event.title,
                tipo: props.event.tipo,
                data: props.event.data,
                processoId: props.event.processoId,
                numeroCnj: props.event.numeroCnj,
              }}
            />
          ),
        }}
        views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
        popup
        selectable={false}
      />

      {ProcessoSheet && (
        <ProcessoSheet
          processo={
            carregandoProcesso
              ? {
                  id: eventoSelecionado?.processoId ?? '',
                  numeroCnj: eventoSelecionado?.numeroCnj ?? 'Carregando...',
                  tribunal: eventoSelecionado?.tribunal ?? undefined,
                }
              : processo
          }
          open={sheetAberta}
          onOpenChange={setSheetAberta}
        />
      )}
    </div>
  );
}

export default CalendarioProcessual;
