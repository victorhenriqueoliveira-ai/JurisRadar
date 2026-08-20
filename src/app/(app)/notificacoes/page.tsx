'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  FileText,
} from 'lucide-react';
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function getIconByTipo(tipo: string) {
  switch (tipo) {
    case 'movimentacao':
      return <FileText className="w-5 h-5 text-blue-500" aria-hidden="true" />;
    case 'prazo':
      return <AlertCircle className="w-5 h-5 text-amber-500" aria-hidden="true" />;
    case 'pagamento':
      return <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />;
    default:
      return <Info className="w-5 h-5 text-muted-foreground" aria-hidden="true" />;
  }
}

function getTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    movimentacao: 'Movimentação',
    prazo: 'Prazo',
    pagamento: 'Pagamento',
    sistema: 'Sistema',
  };
  return labels[tipo] ?? tipo;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function NotificacoesPage() {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtroLida, setFiltroLida] = useState<'todas' | 'nao-lidas' | 'lidas'>('todas');

  const fetchNotificacoes = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams({ limit: '20' });
      if (filtroLida === 'nao-lidas') params.set('lida', 'false');
      if (filtroLida === 'lidas') params.set('lida', 'true');
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/notificacoes?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao carregar notificações');
      const json = await res.json() as { data: Notificacao[]; nextCursor: string | null };
      return json;
    },
    [filtroLida],
  );

  // Carregar ao montar e ao trocar filtro
  useEffect(() => {
    setLoading(true);
    setNotificacoes([]);
    setNextCursor(null);
    fetchNotificacoes()
      .then((json) => {
        setNotificacoes(json.data);
        setNextCursor(json.nextCursor);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchNotificacoes]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const json = await fetchNotificacoes(nextCursor);
      setNotificacoes((prev) => [...prev, ...json.data]);
      setNextCursor(json.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleClickNotificacao(n: Notificacao) {
    if (!n.lida) {
      try {
        await fetch(`/api/notificacoes/${n.id}/lida`, { method: 'PATCH' });
        setNotificacoes((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, lida: true } : item)),
        );
      } catch {
        // silenciar
      }
    }
    if (n.processoId) {
      router.push(`/app/crm?processo=${n.processoId}`);
    }
  }

  async function handleMarcarTodas() {
    setMarking(true);
    try {
      await fetch('/api/notificacoes/lida-todas', { method: 'PATCH' });
      setNotificacoes((prev) => prev.map((item) => ({ ...item, lida: true })));
    } catch {
      // silenciar
    } finally {
      setMarking(false);
    }
  }

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-semibold">Notificações</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 min-w-[1.25rem]">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarcarTodas}
            disabled={marking}
          >
            {marking ? 'Marcando...' : 'Marcar todas como lidas'}
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 border-b border-border pb-3">
        {(['todas', 'nao-lidas', 'lidas'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltroLida(f)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filtroLida === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {f === 'todas' ? 'Todas' : f === 'nao-lidas' ? 'Não lidas' : 'Lidas'}
          </button>
        ))}
      </div>

      {/* Estado de loading */}
      {loading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Carregando notificações...
        </div>
      )}

      {/* Estado vazio */}
      {!loading && notificacoes.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
          <Bell className="w-10 h-10 opacity-20" aria-hidden="true" />
          <p className="text-sm">Nenhuma notificação encontrada</p>
        </div>
      )}

      {/* Lista */}
      {!loading && notificacoes.length > 0 && (
        <ul role="list" className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {notificacoes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleClickNotificacao(n)}
                className={`w-full text-left px-4 py-4 flex gap-4 hover:bg-accent transition-colors ${
                  !n.lida ? 'bg-primary/5' : ''
                }`}
              >
                {/* Indicador de não lida */}
                <div className="mt-1 shrink-0 flex flex-col items-center gap-2">
                  {getIconByTipo(n.tipo)}
                  {!n.lida && (
                    <span className="w-2 h-2 rounded-full bg-primary" aria-label="Não lida" />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p
                      className={`text-sm leading-snug ${
                        !n.lida ? 'font-semibold' : 'font-normal text-muted-foreground'
                      }`}
                    >
                      {n.titulo}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                      {getTipoLabel(n.tipo)}
                    </span>
                  </div>
                  {n.corpo && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                      {n.corpo}
                    </p>
                  )}
                  <time
                    dateTime={n.createdAt}
                    className="text-xs text-muted-foreground"
                  >
                    {formatDate(n.createdAt)}
                  </time>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Carregar mais */}
      {nextCursor && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </div>
  );
}
