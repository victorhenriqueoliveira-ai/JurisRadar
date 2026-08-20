'use client';

/**
 * EventoCalendario — componente de renderização de eventos no calendário.
 *
 * Aplica cores com base no tipo do evento e na urgência do prazo:
 * - audiencia: azul (#2563eb)
 * - intimacao: roxo (#7c3aed)
 * - prazo_fatal ou prazo ≤ 2 dias: vermelho (#dc2626)
 * - prazo 3–7 dias: laranja (#ea580c)
 * - prazo > 7 dias: cinza (#6b7280)
 */

import React from 'react';
import { resolverCorEvento, type TipoEvento } from '@/services/calendario';

export interface EventoCalendarioProps {
  event: {
    title: string;
    tipo: TipoEvento;
    data: string; // YYYY-MM-DD
    processoId: string;
    numeroCnj?: string;
  };
}

export function EventoCalendario({ event }: EventoCalendarioProps) {
  const cor = resolverCorEvento(event.tipo, event.data);

  return (
    <div
      data-testid="evento-calendario"
      data-tipo={event.tipo}
      style={{
        backgroundColor: cor,
        color: '#fff',
        borderRadius: '0.25rem',
        padding: '0.125rem 0.375rem',
        fontSize: '0.75rem',
        lineHeight: 1.4,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
      }}
      title={`${event.title}${event.numeroCnj ? ` — ${event.numeroCnj}` : ''}`}
    >
      {event.title}
    </div>
  );
}

export default EventoCalendario;
