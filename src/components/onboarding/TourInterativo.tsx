'use client';

/**
 * Tour interativo opcional usando driver.js.
 * Destaques em sequência: Dashboard → CRM → Calendário → Notificações.
 * O botão "Pular tour" encerra o tour a qualquer momento.
 */

import { useEffect, useRef } from 'react';
import type { Driver } from 'driver.js';
import { useRouter } from 'next/navigation';

interface TourInterativoProps {
  onConcluir: () => void;
}

const TOUR_STEPS = [
  {
    element: '#tour-dashboard',
    popover: {
      title: 'Dashboard',
      description: 'Acompanhe todos os seus processos em tempo real. Veja status, prazos e movimentações em um só lugar.',
      side: 'bottom' as const,
    },
  },
  {
    element: '#tour-crm',
    popover: {
      title: 'CRM de Clientes',
      description: 'Gerencie seus clientes e contatos. Vincule processos e acompanhe o relacionamento com cada cliente.',
      side: 'bottom' as const,
    },
  },
  {
    element: '#tour-calendario',
    popover: {
      title: 'Calendário de Prazos',
      description: 'Nunca perca um prazo. Receba alertas antecipados e visualize todos os compromissos processuais.',
      side: 'bottom' as const,
    },
  },
];

export function TourInterativo({ onConcluir }: TourInterativoProps) {
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    // Importa driver.js dinamicamente para evitar SSR issues
    import('driver.js').then(({ driver }) => {
      import('driver.js/dist/driver.css').catch(() => {
        // CSS pode não ser importável no ambiente de testes — ignorar
      });

      const driverObj = driver({
        animate: true,
        showProgress: true,
        progressText: 'Passo {{current}} de {{total}}',
        nextBtnText: 'Próximo',
        prevBtnText: 'Anterior',
        doneBtnText: 'Ir para o dashboard',
        steps: TOUR_STEPS,
        onDestroyStarted: () => {
          driverObj.destroy();
          onConcluir();
        },
        onDestroyed: () => {
          onConcluir();
        },
      });

      driverRef.current = driverObj;

      // Aguarda o DOM estar pronto antes de iniciar
      setTimeout(() => {
        try {
          driverObj.drive();
        } catch {
          // Elementos não encontrados no contexto do onboarding — ir direto ao dashboard
          onConcluir();
        }
      }, 300);
    });

    return () => {
      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch {
          // Ignorar erros ao desmontar
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePular() {
    if (driverRef.current) {
      try {
        driverRef.current.destroy();
      } catch {
        // Ignorar
      }
    }
    onConcluir();
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border p-8 text-center">
      <h2 className="text-2xl font-bold mb-2">Tour interativo</h2>
      <p className="text-muted-foreground mb-8">
        Conheça as principais funcionalidades do JurisRadar em 90 segundos.
      </p>

      {/* Elementos âncora do tour */}
      <div className="grid grid-cols-3 gap-3 mb-8 text-left">
        <div id="tour-dashboard" className="rounded-lg bg-muted/40 p-4">
          <p className="text-sm font-semibold mb-1">Dashboard</p>
          <p className="text-xs text-muted-foreground">Visão geral dos seus processos</p>
        </div>
        <div id="tour-crm" className="rounded-lg bg-muted/40 p-4">
          <p className="text-sm font-semibold mb-1">CRM</p>
          <p className="text-xs text-muted-foreground">Gestão de clientes</p>
        </div>
        <div id="tour-calendario" className="rounded-lg bg-muted/40 p-4">
          <p className="text-sm font-semibold mb-1">Calendário</p>
          <p className="text-xs text-muted-foreground">Controle de prazos</p>
        </div>
      </div>

      <div id="tour-notificacoes" className="rounded-lg bg-muted/40 p-4 mb-8 text-left">
        <p className="text-sm font-semibold mb-1">Notificações</p>
        <p className="text-xs text-muted-foreground">
          Alertas em tempo real sobre movimentações e prazos críticos
        </p>
      </div>

      <button
        type="button"
        onClick={handlePular}
        className="text-sm text-muted-foreground underline hover:text-foreground"
      >
        Pular tour
      </button>
    </div>
  );
}
