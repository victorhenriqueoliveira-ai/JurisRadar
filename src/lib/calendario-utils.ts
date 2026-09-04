export type TipoEvento = 'prazo_fatal' | 'audiencia' | 'intimacao' | 'prazo' | 'tarefa' | 'lembrete' | string;

export interface EstiloEvento {
  style: {
    backgroundColor: string;
    borderLeft?: string;
    opacity?: number;
  };
}

const COR_POR_TIPO: Record<string, string> = {
  audiencia: '#2563eb',
  intimacao: '#ea580c',
  prazo_fatal: '#dc2626',
  tarefa: '#16a34a',
  lembrete: '#ca8a04',
};

function diasRestantes(data: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataEvento = new Date(data + 'T00:00:00');
  const diffMs = dataEvento.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Retorna estilo híbrido: cor base por tipo + intensidade/borda por urgência.
 * Compatível com react-big-calendar eventPropGetter.
 */
export function resolverEstiloEvento(tipo: TipoEvento, data: string): EstiloEvento {
  const corBase = COR_POR_TIPO[tipo] ?? '#6b7280';

  // prazo_fatal é sempre vermelho intenso independente de data
  if (tipo === 'prazo_fatal') {
    return { style: { backgroundColor: corBase, borderLeft: '4px solid #991b1b' } };
  }

  const dias = diasRestantes(data);

  if (dias <= 2) {
    return { style: { backgroundColor: corBase, borderLeft: '4px solid rgba(0,0,0,0.3)' } };
  }
  if (dias <= 7) {
    return { style: { backgroundColor: corBase } };
  }
  return { style: { backgroundColor: corBase, opacity: 0.7 } };
}

/** @deprecated Use resolverEstiloEvento */
export function resolverCorEvento(tipo: TipoEvento, data: string): string {
  if (tipo === 'audiencia') return '#2563eb';
  if (tipo === 'intimacao') return '#7c3aed';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataEvento = new Date(data + 'T00:00:00');
  const diffMs = dataEvento.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (tipo === 'prazo_fatal' || diffDias <= 2) return '#dc2626';
  if (diffDias <= 7) return '#ea580c';
  return '#6b7280';
}
