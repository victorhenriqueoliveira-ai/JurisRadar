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
import { resolverCorEvento } from '@/lib/calendario-utils';
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
  processoId?: string;
  numeroCnj?: string;
  tribunal?: string | null;
  pessoal?: boolean;
}

export interface CalendarioProcessualProps {
  eventos: EventoCalendarioItem[];
}

interface EventoAgenda {
  id: string;
  titulo: string;
  data: string;
  horaInicio?: string | null;
  horaFim?: string | null;
  tipo: string;
  descricao?: string | null;
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

function mapEventosAgenda(eventos: EventoAgenda[]): CalendarioEvento[] {
  return eventos.map((ev) => {
    const start = new Date(ev.data + 'T' + (ev.horaInicio ?? '00:00') + ':00');
    const end = new Date(ev.data + 'T' + (ev.horaFim ?? '23:59') + ':00');
    return {
      id: ev.id,
      title: ev.titulo,
      start,
      end,
      tipo: ev.tipo,
      data: ev.data,
      pessoal: true,
    };
  });
}

const TIPOS_EVENTO_PESSOAL = [
  { value: 'pessoal', label: 'Compromisso pessoal' },
  { value: 'audiencia', label: 'Audiência' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'outro', label: 'Outro' },
];

function NovoEventoDialog({
  dataInicial,
  onSave,
  onClose,
}: {
  dataInicial?: string;
  onSave: (ev: EventoAgenda) => void;
  onClose: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(dataInicial ?? new Date().toISOString().slice(0, 10));
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('10:00');
  const [tipo, setTipo] = useState('pessoal');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 focus:border-[#0f2d5e] bg-white';

  async function handleSave() {
    if (!titulo.trim()) { setErro('Título obrigatório'); return; }
    setSaving(true); setErro('');
    try {
      const res = await fetch('/api/calendario/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), data, horaInicio, horaFim, tipo, descricao: descricao || undefined }),
      });
      if (!res.ok) { const j = await res.json(); setErro(j.error ?? 'Erro ao salvar'); return; }
      const ev = await res.json() as EventoAgenda;
      onSave({ ...ev, horaInicio, horaFim });
    } catch { setErro('Erro de conexão'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f2d5e', fontFamily: 'Manrope, sans-serif' }}>Novo evento</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Título *</label>
            <input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Audiência, Reunião com cliente" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Data *</label>
              <input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Tipo</label>
              <select className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS_EVENTO_PESSOAL.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Hora início</label>
              <input type="time" className={inputCls} value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Hora fim</label>
              <input type="time" className={inputCls} value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Observação (opcional)</label>
            <textarea className={inputCls} rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes do evento..." style={{ resize: 'vertical' }} />
          </div>
          {erro && <p style={{ color: '#dc2626', fontSize: '0.8125rem', margin: 0 }}>{erro}</p>}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: 'transparent', fontSize: '0.875rem', cursor: 'pointer', color: '#374151' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '0.5rem', background: '#0f2d5e', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CalendarioProcessual({ eventos }: CalendarioProcessualProps) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [eventoSelecionado, setEventoSelecionado] = useState<CalendarioEvento | null>(null);
  const [sheetAberta, setSheetAberta] = useState(false);
  const [processo, setProcesso] = useState<import('@/components/crm/ProcessoSheet').ProcessoDetalhe | null>(null);
  const [carregandoProcesso, setCarregandoProcesso] = useState(false);
  const [eventosAgendaList, setEventosAgendaList] = useState<EventoAgenda[]>([]);
  const [novoEventoDialog, setNovoEventoDialog] = useState(false);
  const [novoEventoData, setNovoEventoData] = useState<string | undefined>();
  const [processEventos, setProcessEventos] = useState<EventoCalendarioItem[]>(eventos);

  const fetchEventosForDate = useCallback(async (d: Date) => {
    const ano = d.getFullYear();
    const mes = d.getMonth();
    const de = new Date(ano, mes, 1).toISOString().slice(0, 10);
    const ate = new Date(ano, mes + 1, 0).toISOString().slice(0, 10);
    try {
      const res = await fetch(`/api/calendario?de=${de}&ate=${ate}`);
      if (res.ok) {
        const json = await res.json();
        setProcessEventos(json.data ?? []);
      }
    } catch {}
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
    fetchEventosForDate(newDate);
  }, [fetchEventosForDate]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  // Swipe horizontal para mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Busca eventos pessoais ao montar
  useEffect(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const de = new Date(ano, mes - 1, 1).toISOString().slice(0, 10);
    const ate = new Date(ano, mes + 2, 0).toISOString().slice(0, 10);
    fetch(`/api/calendario/eventos?de=${de}&ate=${ate}`)
      .then((r) => r.json())
      .then((d) => setEventosAgendaList(d.data ?? []))
      .catch(() => {});
  }, []);

  const eventosCalendario = [
    ...mapEventos(processEventos),
    ...mapEventosAgenda(eventosAgendaList),
  ];

  // Estilo personalizado por evento
  const eventStyleGetter = useCallback((event: CalendarioEvento) => {
    const cor = event.pessoal ? '#7c3aed' : resolverCorEvento(event.tipo, event.data);
    return {
      style: {
        backgroundColor: cor,
        borderColor: cor,
        color: '#fff',
        borderRadius: '0.25rem',
        border: 'none',
        padding: '0.125rem 0.375rem',
        fontSize: '0.75rem',
        cursor: event.pessoal ? 'default' : 'pointer',
      },
    };
  }, []);

  // Clique em evento → buscar processo e abrir sheet (somente eventos de processo)
  const handleSelectEvent = useCallback(async (event: CalendarioEvento) => {
    if (event.pessoal) return; // eventos pessoais não abrem sheet
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

  // Clique em slot vazio → abrir dialog de novo evento
  const handleSelectSlot = useCallback((slotInfo: { start: Date }) => {
    const data = slotInfo.start.toISOString().slice(0, 10);
    setNovoEventoData(data);
    setNovoEventoDialog(true);
  }, []);

  function handleEventoSaved(ev: EventoAgenda) {
    setEventosAgendaList((prev) => [...prev, ev]);
    setNovoEventoDialog(false);
  }

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
        const next = view === Views.MONTH ? addMonths(date, 1) : addWeeks(date, 1);
        handleNavigate(next);
      } else {
        // Swipe para direita → recuar
        const prev = view === Views.MONTH ? subMonths(date, 1) : subWeeks(date, 1);
        handleNavigate(prev);
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
    <div style={{ position: 'relative' }}>
      {/* Botão novo evento */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => { setNovoEventoData(undefined); setNovoEventoDialog(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            background: '#7c3aed', border: 'none', color: '#fff',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Novo evento
        </button>
      </div>

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
          onNavigate={handleNavigate}
          messages={messages}
          culture="pt-BR"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          components={{
            event: (props) => (
              <EventoCalendario
                event={{
                  title: props.event.title,
                  tipo: props.event.tipo,
                  data: props.event.data,
                  processoId: props.event.processoId ?? '',
                  numeroCnj: props.event.numeroCnj,
                }}
              />
            ),
          }}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          popup
          selectable
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

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '0.125rem', background: '#dc2626', display: 'inline-block' }} />
          Prazo urgente
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '0.125rem', background: '#2563eb', display: 'inline-block' }} />
          Audiência / Processo
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '0.125rem', background: '#7c3aed', display: 'inline-block' }} />
          Evento pessoal
        </span>
      </div>

      {novoEventoDialog && (
        <NovoEventoDialog
          dataInicial={novoEventoData}
          onSave={handleEventoSaved}
          onClose={() => setNovoEventoDialog(false)}
        />
      )}
    </div>
  );
}

export default CalendarioProcessual;
