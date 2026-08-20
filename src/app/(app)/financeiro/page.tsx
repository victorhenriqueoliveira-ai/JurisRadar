import React from 'react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { HonorarioTable } from '@/components/financeiro/HonorarioTable';

/**
 * Página /financeiro — dashboard financeiro com KPIs e listagem de honorários.
 * Server Component — os sub-componentes são Client Components que buscam dados via fetch.
 */
export default function FinanceiroPage() {
  return (
    <div
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Cabeçalho */}
      <div>
        <h1
          style={{
            margin: '0 0 0.25rem',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--jr-primary)',
          }}
        >
          Financeiro
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--jr-primary)', opacity: 0.65 }}>
          Acompanhe honorários e pagamentos dos seus processos.
        </p>
      </div>

      {/* Dashboard KPIs */}
      <section>
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--jr-primary)',
            opacity: 0.8,
          }}
        >
          Resumo do período
        </h2>
        <DashboardFinanceiro />
      </section>

      {/* Listagem de honorários */}
      <section>
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--jr-primary)',
            opacity: 0.8,
          }}
        >
          Honorários
        </h2>
        <div
          style={{
            background: 'var(--jr-glass-bg)',
            border: '1px solid var(--jr-glass-border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            backdropFilter: 'blur(12px)',
          }}
        >
          <HonorarioTable />
        </div>
      </section>
    </div>
  );
}
