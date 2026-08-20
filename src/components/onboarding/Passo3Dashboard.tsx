'use client';

/**
 * Passo 3 do onboarding: preview do dashboard e conclusão.
 * - Exibe contagem de processos importados
 * - Botão "Ir para o dashboard" → PATCH /api/onboarding/complete + redirect
 * - Botão opcional "Fazer tour interativo"
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TourInterativo } from './TourInterativo';

interface Passo3Props {
  processosImportados: number;
}

export function Passo3Dashboard({ processosImportados }: Passo3Props) {
  const router = useRouter();
  const [concluindo, setConcluindo] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function marcarConcluido() {
    setConcluindo(true);
    setErro(null);
    try {
      await fetch('/api/onboarding/complete', { method: 'PATCH' });
    } catch {
      // Ignora erro — o redirect acontece de qualquer forma
    } finally {
      setConcluindo(false);
    }
  }

  async function handleIrDashboard() {
    await marcarConcluido();
    router.push('/app/dashboard');
  }

  async function handleTour() {
    await marcarConcluido();
    setShowTour(true);
  }

  if (showTour) {
    return (
      <TourInterativo
        onConcluir={() => router.push('/app/dashboard')}
      />
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border p-8 text-center">
      <div className="text-5xl mb-4">🎉</div>

      <h2 className="text-2xl font-bold mb-2">Tudo pronto!</h2>

      <p className="text-muted-foreground mb-2">
        {processosImportados > 0
          ? `Seu escritório está configurado com ${processosImportados} processo${processosImportados !== 1 ? 's' : ''} importado${processosImportados !== 1 ? 's' : ''}.`
          : 'Seu escritório está configurado e pronto para uso.'}
      </p>

      <p className="text-muted-foreground text-sm mb-8">
        Você pode importar mais processos a qualquer momento pelo painel.
      </p>

      {/* Preview do dashboard — cards informativos */}
      <div className="grid grid-cols-3 gap-3 mb-8 text-left">
        <div id="tour-dashboard" className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Dashboard</p>
          <p className="text-lg font-bold">{processosImportados}</p>
          <p className="text-xs text-muted-foreground">processos</p>
        </div>
        <div id="tour-crm" className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">CRM</p>
          <p className="text-lg font-bold">—</p>
          <p className="text-xs text-muted-foreground">contatos</p>
        </div>
        <div id="tour-calendario" className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Calendário</p>
          <p className="text-lg font-bold">—</p>
          <p className="text-xs text-muted-foreground">prazos</p>
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-destructive mb-4">
          {erro}
        </p>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleIrDashboard}
          disabled={concluindo}
          className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {concluindo ? 'Carregando...' : 'Ir para o dashboard'}
        </button>

        <button
          type="button"
          onClick={handleTour}
          disabled={concluindo}
          className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-60 transition-colors"
        >
          Fazer tour interativo (90 segundos)
        </button>
      </div>
    </div>
  );
}
