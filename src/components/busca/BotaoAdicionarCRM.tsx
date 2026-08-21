'use client';

import { useState, useEffect } from 'react';

export interface BotaoAdicionarCRMProps {
  numeroCnj: string;
  tribunal?: string;
}

type Estado =
  | { status: 'verificando' }
  | { status: 'monitorado' }
  | { status: 'nao-monitorado' }
  | { status: 'adicionando' }
  | { status: 'adicionado' }
  | { status: 'erro'; message: string };

/**
 * Botão "Adicionar ao CRM" com verificação de "já monitorado".
 *
 * - Verifica via GET /api/processos?q={numeroCnj} se o processo já está no CRM
 * - Se sim: exibe "(já monitorado)"
 * - Se não: exibe botão que chama POST /api/processos para criar o monitoramento
 */
export default function BotaoAdicionarCRM({ numeroCnj, tribunal }: BotaoAdicionarCRMProps) {
  const [estado, setEstado] = useState<Estado>({ status: 'verificando' });

  useEffect(() => {
    let cancelled = false;

    async function verificar() {
      try {
        const resp = await fetch(
          `/api/processos?q=${encodeURIComponent(numeroCnj)}`,
          { cache: 'no-store' },
        );

        if (!resp.ok) {
          // Se 401/403, não mostrar erro — apenas esconder botão silenciosamente
          if (resp.status === 401 || resp.status === 403) {
            if (!cancelled) setEstado({ status: 'nao-monitorado' });
            return;
          }
          throw new Error(`Erro ${resp.status}`);
        }

        const data = await resp.json() as { processos?: Array<unknown>; total?: number };
        const jaMonitorado = (data.total ?? data.processos?.length ?? 0) > 0;

        if (!cancelled) {
          setEstado(jaMonitorado ? { status: 'monitorado' } : { status: 'nao-monitorado' });
        }
      } catch {
        // Falha silenciosa: exibe botão de adicionar por padrão
        if (!cancelled) setEstado({ status: 'nao-monitorado' });
      }
    }

    void verificar();
    return () => { cancelled = true; };
  }, [numeroCnj]);

  async function handleAdicionar() {
    setEstado({ status: 'adicionando' });
    try {
      const resp = await fetch('/api/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroCnj, tribunal }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err?.error ?? `Erro ${resp.status}`);
      }

      setEstado({ status: 'adicionado' });
      // Após 2s muda para "monitorado" permanente
      setTimeout(() => setEstado({ status: 'monitorado' }), 2000);
    } catch (e) {
      setEstado({
        status: 'erro',
        message: e instanceof Error ? e.message : 'Erro ao adicionar',
      });
    }
  }

  if (estado.status === 'verificando') {
    return (
      <span className="text-xs text-gray-400" data-testid="btn-crm-verificando">
        Verificando...
      </span>
    );
  }

  if (estado.status === 'monitorado') {
    return (
      <span
        className="text-xs font-medium text-green-600"
        data-testid="btn-crm-monitorado"
      >
        ✓ Já monitorado
      </span>
    );
  }

  if (estado.status === 'adicionado') {
    return (
      <span
        className="text-xs font-medium text-green-600"
        data-testid="btn-crm-adicionado"
      >
        ✓ Adicionado ao CRM!
      </span>
    );
  }

  if (estado.status === 'erro') {
    return (
      <span
        className="text-xs text-red-600"
        data-testid="btn-crm-erro"
        title={estado.message}
      >
        Erro ao adicionar
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdicionar}
      disabled={estado.status === 'adicionando'}
      data-testid="btn-adicionar-crm"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {estado.status === 'adicionando' ? 'Adicionando...' : '+ Adicionar ao CRM'}
    </button>
  );
}
