'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  FileText,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Notificacao {
  id: string;
  orgId: string;
  userId: string | null;
  processoId: string | null;
  tipo: string;
  titulo: string;
  corpo: string | null;
  lida: boolean;
  lidaAt: string | null;
  createdAt: string;
}

interface NotificacoesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountUpdate?: (count: number) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getIconByTipo(tipo: string) {
  switch (tipo) {
    case 'movimentacao':
      return <FileText className="w-4 h-4 text-blue-500" aria-hidden="true" />;
    case 'prazo':
      return <AlertCircle className="w-4 h-4 text-amber-500" aria-hidden="true" />;
    case 'pagamento':
      return <CheckCircle2 className="w-4 h-4 text-green-500" aria-hidden="true" />;
    default:
      return <Info className="w-4 h-4 text-muted-foreground" aria-hidden="true" />;
  }
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffH < 24) return `${diffH}h atrás`;
  if (diffD === 1) return 'ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function NotificacoesSheet({
  open,
  onOpenChange,
  onCountUpdate,
}: NotificacoesSheetProps) {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  const fetchNotificacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notificacoes?limit=30');
      if (!res.ok) return;
      const json = await res.json() as { data: Notificacao[] };
      setNotificacoes(json.data ?? []);
    } catch {
      // silenciar erros de rede
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarregar ao abrir o painel
  useEffect(() => {
    if (open) {
      fetchNotificacoes();
    }
  }, [open, fetchNotificacoes]);

  async function handleClickNotificacao(n: Notificacao) {
    // Marcar como lida
    if (!n.lida) {
      try {
        await fetch(`/api/notificacoes/${n.id}/lida`, { method: 'PATCH' });
        setNotificacoes((prev) =>
          prev.map((item) =>
            item.id === n.id ? { ...item, lida: true } : item,
          ),
        );
        // Atualizar contagem no header
        const unread = notificacoes.filter((item) => !item.lida && item.id !== n.id).length;
        onCountUpdate?.(unread);
      } catch {
        // silenciar erros de rede
      }
    }

    // Navegar para o processo no CRM
    if (n.processoId) {
      onOpenChange(false);
      router.push(`/app/crm?processo=${n.processoId}`);
    }
  }

  async function handleMarcarTodas() {
    setMarking(true);
    try {
      await fetch('/api/notificacoes/lida-todas', { method: 'PATCH' });
      setNotificacoes((prev) => prev.map((item) => ({ ...item, lida: true })));
      onCountUpdate?.(0);
    } catch {
      // silenciar erros de rede
    } finally {
      setMarking(false);
    }
  }

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="border-b border-border px-4 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4" aria-hidden="true" />
              Notificações
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 min-w-[1.25rem]">
                  {unreadCount}
                </span>
              )}
            </SheetTitle>
            <button
              type="button"
              aria-label="Fechar painel de notificações"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              Carregando...
            </div>
          )}

          {!loading && notificacoes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Bell className="w-8 h-8 opacity-30" aria-hidden="true" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          )}

          {!loading && notificacoes.length > 0 && (
            <ul role="list" className="divide-y divide-border">
              {notificacoes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClickNotificacao(n)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-accent transition-colors ${
                      !n.lida ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Ícone */}
                    <div className="mt-0.5 shrink-0">
                      {getIconByTipo(n.tipo)}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-snug truncate ${
                            !n.lida ? 'font-semibold' : 'font-normal'
                          }`}
                        >
                          {n.titulo}
                        </p>
                        <time
                          dateTime={n.createdAt}
                          className="text-xs text-muted-foreground shrink-0"
                        >
                          {formatRelativeDate(n.createdAt)}
                        </time>
                      </div>
                      {n.corpo && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.corpo}
                        </p>
                      )}
                      {!n.lida && (
                        <span className="inline-block mt-1 w-2 h-2 rounded-full bg-primary" aria-label="Não lida" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rodapé */}
        {unreadCount > 0 && (
          <SheetFooter className="border-t border-border px-4 py-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleMarcarTodas}
              disabled={marking}
            >
              {marking ? 'Marcando...' : 'Marcar todas como lidas'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
