'use client';

/**
 * ConfirmarCienciaButton
 *
 * Botão "Confirmar ciência" exibido apenas para notificações de tipos críticos
 * que ainda não foram confirmadas. Após clique, realiza optimistic update e
 * chama POST /api/notificacoes/[id]/confirmar.
 *
 * Tipos críticos: intimacao | citacao | prazo_fatal | decisao | sentenca
 */

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIPOS_CRITICOS } from '@/inngest/notificacao-dispatcher';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ConfirmarCienciaButtonProps {
  notificacaoId: string;
  tipo: string;
  confirmadoEm: string | null;
  /** Callback chamado após confirmação bem-sucedida */
  onConfirmado?: (confirmadoEm: string) => void;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function ConfirmarCienciaButton({
  notificacaoId,
  tipo,
  confirmadoEm: confirmadoEmProp,
  onConfirmado,
}: ConfirmarCienciaButtonProps) {
  const [confirmadoEm, setConfirmadoEm] = useState<string | null>(confirmadoEmProp);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Exibir apenas para tipos críticos
  const isCritico = (TIPOS_CRITICOS as readonly string[]).includes(tipo);
  if (!isCritico) return null;

  const jaConfirmado = confirmadoEm !== null;

  async function handleConfirmar() {
    if (jaConfirmado || loading) return;

    setLoading(true);
    setErro(null);

    // Optimistic update imediato
    const agora = new Date().toISOString();
    setConfirmadoEm(agora);

    try {
      const res = await fetch(`/api/notificacoes/${notificacaoId}/confirmar`, {
        method: 'POST',
      });

      if (!res.ok) {
        if (res.status === 409) {
          // Já confirmado — atualiza com data real se disponível
          const json = await res.json() as { confirmadoEm?: string };
          if (json.confirmadoEm) {
            setConfirmadoEm(json.confirmadoEm);
            onConfirmado?.(json.confirmadoEm);
          }
          return;
        }
        // Reverter optimistic update em caso de erro
        setConfirmadoEm(confirmadoEmProp);
        setErro('Erro ao confirmar. Tente novamente.');
        return;
      }

      onConfirmado?.(agora);
    } catch {
      // Reverter optimistic update em caso de erro de rede
      setConfirmadoEm(confirmadoEmProp);
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant={jaConfirmado ? 'outline' : 'default'}
        size="sm"
        className={
          jaConfirmado
            ? 'gap-1.5 text-green-700 border-green-300 bg-green-50 hover:bg-green-50 cursor-default'
            : 'gap-1.5'
        }
        onClick={handleConfirmar}
        disabled={jaConfirmado || loading}
        aria-label={jaConfirmado ? 'Ciência já confirmada' : 'Confirmar ciência desta intimação'}
        data-testid="confirmar-ciencia-button"
        data-confirmado={jaConfirmado ? 'true' : 'false'}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        {jaConfirmado ? 'Ciência confirmada' : loading ? 'Confirmando...' : 'Confirmar ciência'}
      </Button>

      {erro && (
        <p className="mt-1 text-xs text-destructive" data-testid="confirmar-ciencia-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
