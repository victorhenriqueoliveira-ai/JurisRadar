'use client';

import React, { useState, useEffect } from 'react';

interface EventoDia {
  id: string;
  titulo: string;
  tipo: string;
  hora_inicio?: string | null;
  fonte: string;
}

const TIPO_LABEL: Record<string, string> = {
  audiencia: 'Audiência',
  intimacao: 'Intimação',
  prazo_fatal: 'Prazo Fatal',
  prazo: 'Prazo',
  tarefa: 'Tarefa',
  lembrete: 'Lembrete',
  pessoal: 'Pessoal',
};

export function FocoDoDia() {
  const [eventos, setEventos] = useState<EventoDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/calendario/foco-do-dia')
      .then((r) => r.json())
      .then((d) => setEventos(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const progresso =
    eventos.length === 0 ? 0 : Math.round((concluidos.size / eventos.length) * 100);

  function toggle(id: string) {
    setConcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div
      data-testid="foco-do-dia"
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1rem 1.25rem',
        marginBottom: '0.75rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f2d5e', fontFamily: 'Manrope, sans-serif' }}>
            Foco do Dia
          </h3>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>{hoje}</p>
        </div>
        {eventos.length > 0 && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: progresso === 100 ? '#16a34a' : '#0f2d5e',
              background: progresso === 100 ? '#dcfce7' : '#eff6ff',
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
            }}
          >
            {progresso}%
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      {eventos.length > 0 && (
        <div
          role="progressbar"
          aria-valuenow={progresso}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: '0.75rem' }}
        >
          <div
            style={{
              height: '100%',
              width: `${progresso}%`,
              background: progresso === 100 ? '#16a34a' : '#2563eb',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: 0 }}>Carregando…</p>
      ) : eventos.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.8125rem', margin: 0 }}>Nenhum evento para hoje. 🎉</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {eventos.map((ev) => {
            const feito = concluidos.has(ev.id);
            return (
              <li
                key={ev.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}
              >
                <button
                  type="button"
                  aria-label={feito ? 'Marcar como pendente' : 'Marcar como concluído'}
                  onClick={() => toggle(ev.id)}
                  style={{
                    flexShrink: 0,
                    width: '1.25rem',
                    height: '1.25rem',
                    marginTop: '0.125rem',
                    borderRadius: '0.25rem',
                    border: `2px solid ${feito ? '#16a34a' : '#d1d5db'}`,
                    background: feito ? '#16a34a' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.75rem',
                  }}
                >
                  {feito ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: feito ? '#9ca3af' : '#111827',
                      textDecoration: feito ? 'line-through' : 'none',
                      lineHeight: 1.4,
                    }}
                  >
                    {ev.hora_inicio && (
                      <span style={{ color: '#6b7280', marginRight: '0.375rem', fontSize: '0.75rem' }}>
                        {ev.hora_inicio}
                      </span>
                    )}
                    {ev.titulo}
                  </p>
                  <p style={{ margin: '0.125rem 0 0', fontSize: '0.6875rem', color: '#9ca3af' }}>
                    {TIPO_LABEL[ev.tipo] ?? ev.tipo}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default FocoDoDia;
