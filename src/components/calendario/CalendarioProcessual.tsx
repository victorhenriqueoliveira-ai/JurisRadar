'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventoCalendarioItem } from '@/services/calendario';
import { resolverEstiloEvento } from '@/lib/calendario-utils';
import { EventoCalendario } from './EventoCalendario';
import { FocoDoDia } from './FocoDoDia';

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales,
});

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
  horaInicio?: string | null;
  pessoal?: boolean;
  fonte?: string;
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
  fonte?: string;
}

// DnD-enabled Calendar
const DnDCalendar = withDragAndDrop<CalendarioEvento>(Calendar);

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
      horaInicio: ev.horaInicio,
      pessoal: true,
      fonte: ev.fonte ?? 'agenda',
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
  const [focoDoDia, setFocoDoDia] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  function showToast(text: string, ok = false) {
    setToastMsg({ text, ok });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 4000);
  }

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
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Busca eventos de agenda pessoal ao montar
  useEffect(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const start = new Date(ano, mes - 1, 1).toISOString().slice(0, 10);
    const end = new Date(ano, mes + 2, 0).toISOString().slice(0, 10);
    fetch(`/api/calendario/eventos?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => {
        // filtra apenas eventos de agenda para evitar duplicação com process events
        const agenda = (d.data ?? []).filter((e: EventoAgenda) => e.fonte === 'agenda' || !e.fonte);
        setEventosAgendaList(agenda);
      })
      .catch(() => {});
  }, []);

  // Drag & Drop handler
  const handleEventDrop = useCallback(async ({ event, start }: { event: CalendarioEvento; start: Date | string }) => {
    if (!event.fonte) return;
    const novaData = new Date(start).toISOString().slice(0, 10);

    // Optimistic update
    setEventosAgendaList((prev) =>
      prev.map((ev) => ev.id === event.id ? { ...ev, data: novaData } : ev),
    );

    try {
      const res = await fetch(`/api/calendario/eventos/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fonte: event.fonte, data: novaData, tipo: event.tipo }),
      });

      if (res.status === 422) {
        const json = await res.json();
        showToast(json.error ?? 'Prazo fatal não pode ser movido para data passada.');
        setEventosAgendaList((prev) =>
          prev.map((ev) => ev.id === event.id ? { ...ev, data: event.data } : ev),
        );
      } else if (!res.ok) {
        showToast('Erro ao mover evento.');
        setEventosAgendaList((prev) =>
          prev.map((ev) => ev.id === event.id ? { ...ev, data: event.data } : ev),
        );
      }
    } catch {
      showToast('Erro de conexão ao mover evento.');
      setEventosAgendaList((prev) =>
        prev.map((ev) => ev.id === event.id ? { ...ev, data: event.data } : ev),
      );
    }
  }, []);

  const eventosCalendario = [
    ...mapEventos(processEventos),
    ...mapEventosAgenda(eventosAgendaList),
  ];

  // Estilo personalizado por tipo + urgência (task_17)
  const eventStyleGetter = useCallback((event: CalendarioEvento) => {
    const estilo = resolverEstiloEvento(event.tipo, event.data);
    const style: React.CSSProperties = {
      color: '#fff',
      borderRadius: '0.25rem',
      border: 'none',
      padding: '0.125rem 0.375rem',
      fontSize: '0.75rem',
      cursor: event.pessoal ? 'default' : 'pointer',
      backgroundColor: event.pessoal ? '#7c3aed' : estilo.style.backgroundColor,
    };
    if (!event.pessoal) {
      if (estilo.style.borderLeft) style.borderLeft = estilo.style.borderLeft;
      if (estilo.style.opacity !== undefined) style.opacity = estilo.style.opacity;
    }
    return { style };
  }, []);

  const handleSelectEvent = useCallback(async (event: CalendarioEvento) => {
    if (event.pessoal) return;
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
      // falha silenciosa
    } finally {
      setCarregandoProcesso(false);
    }
  }, []);

  const handleSelectSlot = useCallback((slotInfo: { start: Date }) => {
    const data = slotInfo.start.toISOString().slice(0, 10);
    setNovoEventoData(data);
    setNovoEventoDialog(true);
  }, []);

  function handleEventoSaved(ev: EventoAgenda) {
    setEventosAgendaList((prev) => [...prev, ev]);
    setNovoEventoDialog(false);
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (deltaX < 0) {
        handleNavigate(view === Views.MONTH ? addMonths(date, 1) : addWeeks(date, 1));
      } else {
        handleNavigate(view === Views.MONTH ? subMonths(date, 1) : subWeeks(date, 1));
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [view, date, handleNavigate],
  );

  const [ProcessoSheet, setProcessoSheet] =
    useState<React.ComponentType<import('@/components/crm/ProcessoSheet').ProcessoSheetProps> | null>(null);

  useEffect(() => {
    import('@/components/crm/ProcessoSheet').then((mod) => {
      setProcessoSheet(() => mod.ProcessoSheet);
    });
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setFocoDoDia((prev) => !prev)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            background: focoDoDia ? '#0f2d5e' : '#f3f4f6',
            border: 'none',
            color: focoDoDia ? '#fff' : '#374151',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {focoDoDia ? '← Calendário' : '🎯 Foco do dia'}
        </button>
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

      {/* Foco do dia */}
      {focoDoDia && <FocoDoDia />}

      {/* Calendário */}
      {!focoDoDia && (
        <div
          ref={wrapperRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ height: '75vh', minHeight: 500, position: 'relative' }}
          data-testid="calendario-processual"
        >
          <DnDCalendar
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
            draggableAccessor={(event) => Boolean(event.fonte)}
            onEventDrop={handleEventDrop}
            resizable={false}
            components={{
              event: (props) => (
                <EventoCalendario
                  event={{
                    title: props.event.title,
                    tipo: props.event.tipo,
                    data: props.event.data,
                    processoId: props.event.processoId ?? '',
                    numeroCnj: props.event.numeroCnj,
                    horaInicio: props.event.horaInicio,
                    fonte: props.event.fonte,
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
      )}

      {/* Legenda */}
      {!focoDoDia && (
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
      )}

      {/* Toast de feedback DnD */}
      {toastMsg && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 99999,
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            background: toastMsg.ok ? '#16a34a' : '#dc2626',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            maxWidth: '340px',
          }}
        >
          {toastMsg.text}
        </div>
      )}

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
