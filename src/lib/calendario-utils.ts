export type TipoEvento = 'prazo_fatal' | 'audiencia' | 'intimacao' | 'prazo' | string;

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
