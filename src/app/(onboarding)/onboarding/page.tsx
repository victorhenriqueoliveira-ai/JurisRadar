'use client';

/**
 * Wizard de onboarding em 4 passos.
 * Passo 1: dados do escritório
 * Passo 2: importação de processos via OAB
 * Passo 3: configuração de recebimento Asaas
 * Passo 4: preview do dashboard + conclusão
 */

import { useState } from 'react';
import { Passo1Escritorio } from '@/components/onboarding/Passo1Escritorio';
import { Passo2Importacao } from '@/components/onboarding/Passo2Importacao';
import { Passo3Dashboard } from '@/components/onboarding/Passo3Dashboard';
import { Passo4Asaas } from '@/components/onboarding/Passo4Asaas';

export type OnboardingStep = 1 | 2 | 3 | 4;

const LABELS: Record<OnboardingStep, string> = {
  1: 'Escritório',
  2: 'Importação',
  3: 'Pagamentos',
  4: 'Dashboard',
};

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [processosImportados, setProcessosImportados] = useState<number>(0);

  const totalSteps = 4;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Indicador de progresso */}
      <div
        className="w-full max-w-lg mb-8"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        <div className="flex items-center gap-2 mb-2">
          {([1, 2, 3, 4] as OnboardingStep[]).map((s) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : s < step
                    ? 'bg-primary/60 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              <span className="text-xs text-muted-foreground">{LABELS[s]}</span>
            </div>
          ))}
        </div>
        <div className="h-1 bg-muted rounded-full">
          <div
            className="h-1 bg-primary rounded-full transition-all"
            style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Conteúdo do passo atual */}
      <div className="w-full max-w-lg">
        {step === 1 && <Passo1Escritorio onProximo={() => setStep(2)} />}
        {step === 2 && (
          <Passo2Importacao
            onProximo={(count) => {
              setProcessosImportados(count);
              setStep(3);
            }}
            onPular={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Passo4Asaas
            onProximo={() => setStep(4)}
            onPular={() => setStep(4)}
          />
        )}
        {step === 4 && <Passo3Dashboard processosImportados={processosImportados} />}
      </div>
    </div>
  );
}
