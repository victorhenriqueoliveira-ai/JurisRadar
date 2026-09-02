'use client';

/**
 * GarantiaStatusIndicator
 *
 * Badge colorido que mostra o passo atual do protocolo de garantia de intimação.
 * Consome GET /api/notificacoes/[id]/garantia ao montar.
 *
 * Steps e cores:
 *   email_enviado      → azul
 *   sms_whatsapp_enviado → laranja (urgente)
 *   backup_notificado  → vermelho (crítico)
 *   confirmado         → verde
 */

import { useEffect, useState } from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type GarantiaStep =
  | 'email_enviado'
  | 'sms_whatsapp_enviado'
  | 'backup_notificado'
  | 'confirmado';

export interface GarantiaState {
  step: GarantiaStep;
  emailEnviadoEm: string | null;
  smsEnviadoEm: string | null;
  whatsappEnviadoEm: string | null;
  backupNotificadoEm: string | null;
  confirmadoEm: string | null;
}

export interface GarantiaStatusIndicatorProps {
  notificacaoId: string;
  /** Estado inicial (opcional) — evita fetch se já disponível */
  initialState?: GarantiaState | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

interface StepConfig {
  label: string;
  description: string;
  className: string;
}

const STEP_CONFIG: Record<GarantiaStep, StepConfig> = {
  email_enviado: {
    label: 'E-mail enviado',
    description: 'Aguardando confirmação de ciência',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  sms_whatsapp_enviado: {
    label: 'SMS/WhatsApp enviado',
    description: 'Urgente: ciência não confirmada após 2h',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  backup_notificado: {
    label: 'Contato backup acionado',
    description: 'Crítico: escalado para contato de backup',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  confirmado: {
    label: 'Ciência confirmada',
    description: 'Protocolo encerrado com confirmação',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
};

// ── Componente ─────────────────────────────────────────────────────────────────

export function GarantiaStatusIndicator({
  notificacaoId,
  initialState,
}: GarantiaStatusIndicatorProps) {
  const [estado, setEstado] = useState<GarantiaState | null>(initialState ?? null);
  const [loading, setLoading] = useState(initialState === undefined);

  useEffect(() => {
    // Se já temos o estado inicial, não buscar novamente
    if (initialState !== undefined) return;

    let cancelled = false;

    async function fetchGarantia() {
      try {
        const res = await fetch(`/api/notificacoes/${notificacaoId}/garantia`);

        if (!res.ok || res.status === 204) {
          // Sem garantia ou erro — não exibir indicador
          if (!cancelled) setEstado(null);
          return;
        }

        const data = await res.json() as GarantiaState;
        if (!cancelled) setEstado(data);
      } catch {
        // Silenciar erros de rede — não bloquear a UI
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGarantia();

    return () => {
      cancelled = true;
    };
  }, [notificacaoId, initialState]);

  if (loading) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded border text-xs bg-muted text-muted-foreground border-border animate-pulse"
        data-testid="garantia-status-loading"
        aria-label="Carregando estado da garantia"
      >
        Verificando protocolo...
      </span>
    );
  }

  if (!estado) return null;

  const config = STEP_CONFIG[estado.step] ?? STEP_CONFIG.email_enviado;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${config.className}`}
      data-testid="garantia-status-badge"
      data-step={estado.step}
      title={config.description}
      role="status"
      aria-label={`Protocolo de garantia: ${config.label}. ${config.description}`}
    >
      {config.label}
    </span>
  );
}
