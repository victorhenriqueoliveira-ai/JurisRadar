'use client';

import React, { useState, useRef } from 'react';
import { resolverEstiloEvento, type TipoEvento } from '@/lib/calendario-utils';

export interface EventoCalendarioProps {
  event: {
    title: string;
    tipo: TipoEvento;
    data: string;
    processoId: string;
    numeroCnj?: string;
    horaInicio?: string | null;
    fonte?: string;
  };
}

const TIPO_LABEL: Record<string, string> = {
  audiencia: 'Audiência',
  intimacao: 'Intimação',
  prazo_fatal: 'Prazo Fatal',
  prazo: 'Prazo',
  tarefa: 'Tarefa',
  lembrete: 'Lembrete',
  pessoal: 'Pessoal',
  reuniao: 'Reunião',
};

export function EventoCalendario({ event }: EventoCalendarioProps) {
  const estilo = resolverEstiloEvento(event.tipo, event.data);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => setTooltipVisible(true), 300);
  }

  function handleMouseLeave() {
    clearTimeout(timerRef.current);
    setTooltipVisible(false);
  }

  const dataFormatada = new Date(event.data + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <div
      data-testid="evento-calendario"
      data-tipo={event.tipo}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => { clearTimeout(timerRef.current); setTooltipVisible(false); }}
      style={{
        ...estilo.style,
        color: '#fff',
        borderRadius: '0.25rem',
        padding: '0.125rem 0.375rem',
        fontSize: '0.75rem',
        lineHeight: 1.4,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {event.title}

      {tooltipVisible && (
        <div
          data-testid="evento-tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9999,
            background: '#1f2937',
            color: '#f9fafb',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            whiteSpace: 'normal',
            minWidth: '180px',
            maxWidth: '260px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
          }}
        >
          {event.numeroCnj && (
            <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.6875rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {event.numeroCnj}
            </p>
          )}
          <p style={{ margin: '0 0 0.125rem', fontWeight: 600 }}>{event.title}</p>
          <p style={{ margin: '0 0 0.125rem', opacity: 0.8 }}>
            {TIPO_LABEL[event.tipo] ?? event.tipo}
          </p>
          <p style={{ margin: 0, opacity: 0.7 }}>
            {dataFormatada}
            {event.horaInicio && ` às ${event.horaInicio}`}
          </p>
        </div>
      )}
    </div>
  );
}

export default EventoCalendario;
