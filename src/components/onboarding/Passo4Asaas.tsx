'use client';

/**
 * Passo 4 do onboarding: configuração de recebimento de honorários via Asaas.
 *
 * Comportamento:
 * - Na montagem, chama POST /api/asaas/connect para criar a sub-conta.
 *   Se já existir (409), inicia direto o polling de status.
 * - Polling de GET /api/asaas/connect a cada 2s, máximo 15 iterações (30s).
 * - Após 5s, exibe botão "Pular por enquanto" sempre visível.
 * - Sucesso quando status = 'active'; informativo se status = 'pending'.
 */

import { useEffect, useRef, useState } from 'react';

interface Passo4Props {
  onProximo: () => void;
  onPular: () => void;
  /** Intervalo de polling em ms. Padrão: 2000. Usar valor menor em testes. */
  _pollingIntervalMs?: number;
  /** Delay para exibir botão "Pular" em ms. Padrão: 5000. Usar valor menor em testes. */
  _skipDelayMs?: number;
}

type AsaasStatus = 'idle' | 'connecting' | 'polling' | 'active' | 'pending' | 'timeout' | 'error';

export function Passo4Asaas({
  onProximo,
  onPular,
  _pollingIntervalMs = 2000,
  _skipDelayMs = 5000,
}: Passo4Props) {
  const [status, setStatus] = useState<AsaasStatus>('idle');
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarPular, setMostrarPular] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iteracoesRef = useRef(0);
  const MAX_ITERACOES = 15;

  function pararPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function iniciarPolling() {
    setStatus('polling');
    iteracoesRef.current = 0;

    pollingRef.current = setInterval(async () => {
      iteracoesRef.current += 1;

      try {
        const res = await fetch('/api/asaas/connect');
        if (!res.ok) {
          pararPolling();
          setStatus('error');
          setErro('Erro ao verificar status da conta Asaas.');
          return;
        }

        const data: { status: string | null } = await res.json();

        if (data.status === 'active') {
          pararPolling();
          setStatus('active');
        } else if (iteracoesRef.current >= MAX_ITERACOES) {
          pararPolling();
          // Status pending ou sem ativação após 30s
          setStatus('pending');
        }
      } catch {
        pararPolling();
        setStatus('error');
        setErro('Erro de conexão ao verificar status Asaas.');
      }
    }, _pollingIntervalMs);
  }

  useEffect(() => {
    let cancelado = false;

    async function conectar() {
      setStatus('connecting');

      try {
        const res = await fetch('/api/asaas/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (cancelado) return;

        if (res.status === 409) {
          // Sub-conta já existe — ir direto para polling
          await iniciarPolling();
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus('error');
          setErro(data.error ?? 'Erro ao criar conta de recebimento.');
          return;
        }

        const data: { status: string } = await res.json();

        if (data.status === 'active') {
          setStatus('active');
          return;
        }

        // Sub-conta criada com status pending — iniciar polling
        await iniciarPolling();
      } catch {
        if (cancelado) return;
        setStatus('error');
        setErro('Erro de conexão. Verifique sua internet e tente novamente.');
      }
    }

    conectar();

    // Exibe botão "Pular" após _skipDelayMs
    const timer = setTimeout(() => {
      if (!cancelado) setMostrarPular(true);
    }, _skipDelayMs);

    return () => {
      cancelado = true;
      pararPolling();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregando = status === 'connecting' || status === 'polling';

  return (
    <div className="bg-card rounded-xl shadow-sm border p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Configurar recebimento de honorários</h2>
        <p className="text-muted-foreground">
          Estamos criando sua conta de pagamentos integrada ao Asaas para que você possa cobrar
          clientes diretamente pelo JurisRadar.
        </p>
      </div>

      <div className="space-y-4">
        {/* Estado de loading / polling */}
        {carregando && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-lg bg-muted/50 p-4"
          >
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">
              Criando sua conta de recebimento...
            </span>
          </div>
        )}

        {/* Sucesso — conta ativa */}
        {status === 'active' && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg bg-green-50 border border-green-200 p-4"
          >
            <p className="text-sm font-medium text-green-800">
              Conta de recebimento ativada com sucesso!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Você já pode cobrar clientes diretamente pelo JurisRadar.
            </p>
          </div>
        )}

        {/* Informativo — KYC em revisão */}
        {status === 'pending' && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg bg-amber-50 border border-amber-200 p-4"
          >
            <p className="text-sm font-medium text-amber-800">
              Conta em análise
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Sua conta está sendo analisada pelo Asaas. Você receberá uma confirmação em breve.
              Pode continuar usando o JurisRadar normalmente.
            </p>
          </div>
        )}

        {/* Timeout sem ativação */}
        {status === 'timeout' && (
          <div role="status" aria-live="polite" className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              A ativação está demorando mais que o esperado. Você pode pular e ativar depois.
            </p>
          </div>
        )}

        {/* Erro */}
        {status === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}

        {/* Botões de ação */}
        <div className="flex flex-col gap-2 pt-2">
          {(status === 'active' || status === 'pending') && (
            <button
              type="button"
              onClick={onProximo}
              className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Continuar
            </button>
          )}

          {/* Botão pular — sempre visível após 5s */}
          {mostrarPular && status !== 'active' && (
            <button
              type="button"
              onClick={onPular}
              className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
            >
              Pular por enquanto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
