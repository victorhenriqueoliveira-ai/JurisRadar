/**
 * Página do Calendário Processual — Server Component.
 *
 * Busca os eventos do mês corrente via API interna e renderiza o
 * componente client CalendarioProcessual.
 *
 * Isolamento multi-tenant: o endpoint /api/calendario aplica requireOrgContext()
 * e filtra eventos por org_id (ADR-002).
 */

import { Suspense } from 'react';
import { cookies, headers } from 'next/headers';
import { CalendarioProcessual } from '@/components/calendario/CalendarioProcessual';
import type { EventoCalendarioItem } from '@/services/calendario';

async function fetchEventosMesAtual(): Promise<EventoCalendarioItem[]> {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  const de = new Date(ano, mes, 1).toISOString().slice(0, 10);
  const ate = new Date(ano, mes + 1, 0).toISOString().slice(0, 10);

  // Obtém URL base da requisição atual para chamada server-side
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${proto}://${host}`;

  // Repassa cookies de sessão para autenticação
  const cookieHeader = (await cookies()).toString();

  try {
    const res = await fetch(
      `${baseUrl}/api/calendario?de=${de}&ate=${ate}`,
      {
        headers: {
          cookie: cookieHeader,
        },
        // Não cachear no servidor — dados mudam com frequência
        cache: 'no-store',
      },
    );

    if (!res.ok) return [];

    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

function CalendarioSkeleton() {
  return (
    <div
      style={{
        height: '75vh',
        minHeight: 500,
        background: 'var(--jr-glass)',
        borderRadius: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--jr-primary)',
        opacity: 0.5,
      }}
    >
      Carregando calendário...
    </div>
  );
}

async function CalendarioComEventos() {
  const eventos = await fetchEventosMesAtual();
  return <CalendarioProcessual eventos={eventos} />;
}

export default function CalendarioPage() {
  return (
    <main style={{ padding: '1.5rem', maxWidth: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--jr-primary)',
          }}
        >
          Calendário Processual
        </h1>

        <a
          href="/api/calendario/export.ics"
          download="jurisradar-calendario.ics"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.5rem 1rem',
            background: 'var(--jr-primary)',
            color: 'var(--jr-primary-foreground, #fff)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ⬇ Exportar iCal
        </a>
      </div>

      {/* Legenda de cores */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.75rem',
        }}
      >
        {[
          { cor: '#dc2626', label: 'Prazo fatal / ≤ 2 dias' },
          { cor: '#ea580c', label: 'Prazo 3–7 dias' },
          { cor: '#2563eb', label: 'Audiência' },
          { cor: '#7c3aed', label: 'Intimação' },
          { cor: '#6b7280', label: 'Prazo > 7 dias' },
        ].map(({ cor, label }) => (
          <span
            key={cor}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--jr-primary)' }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '0.2rem',
                background: cor,
              }}
            />
            {label}
          </span>
        ))}
      </div>

      <Suspense fallback={<CalendarioSkeleton />}>
        {/* @ts-expect-error — Server Component assíncrono */}
        <CalendarioComEventos />
      </Suspense>
    </main>
  );
}
