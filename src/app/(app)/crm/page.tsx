'use client';

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ProcessoTable, type ProcessoRow, type SortState } from '@/components/crm/ProcessoTable';
import { ProcessoFilters, type FilterValues } from '@/components/crm/ProcessoFilters';
import { ProcessoSheet, type ProcessoDetalhe } from '@/components/crm/ProcessoSheet';
import { ProcessoCard } from '@/components/crm/ProcessoCard';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ApiResponse {
  data: ProcessoRow[];
  nextCursor: string | null;
  total: number;
}

interface State {
  processos: ProcessoRow[];
  nextCursor: string | null;
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  lastSync: Date | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: ApiResponse; append: boolean }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'LOAD_MORE_START' }
  | { type: 'LOAD_MORE_SUCCESS'; payload: ApiResponse };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        processos: action.append ? [...state.processos, ...action.payload.data] : action.payload.data,
        nextCursor: action.payload.nextCursor,
        total: action.payload.total,
        lastSync: new Date(),
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'LOAD_MORE_START':
      return { ...state, loadingMore: true };
    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        loadingMore: false,
        processos: [...state.processos, ...action.payload.data],
        nextCursor: action.payload.nextCursor,
        total: action.payload.total,
      };
    default:
      return state;
  }
}

const initialState: State = {
  processos: [],
  nextCursor: null,
  total: 0,
  loading: false,
  loadingMore: false,
  error: null,
  lastSync: null,
};

// ── Component ──────────────────────────────────────────────────────────────────

const AUTO_SYNC_STORAGE_KEY = 'jurisradar_crm_autosync_at';
const AUTO_SYNC_MIN_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4h
const AUTO_SYNC_LOOKBACK_DAYS = 30;
const AUTO_SYNC_PAGE_SIZE = 100;
const AUTO_SYNC_MAX_PAGES = 10;

interface DjenPublicacao {
  id: number;
  data_disponibilizacao: string;
  siglaTribunal: string;
  tipoComunicacao: string;
  nomeOrgao: string;
  numero_processo: string;
  numeroprocessocommascara: string;
  nomeClasse?: string;
  texto?: string;
}

/**
 * Busca publicações recentes do DJEN diretamente do navegador do advogado —
 * a API comunicaapi.pje.jus.br bloqueia IPs de datacenter (Vercel), então
 * esse fetch precisa rodar no cliente, não no servidor.
 */
async function buscarDjenNoNavegador(oabNumero: string, oabEstado: string): Promise<DjenPublicacao[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - AUTO_SYNC_LOOKBACK_DAYS);
  const dataInicio = desde.toISOString().slice(0, 10);

  const all: DjenPublicacao[] = [];
  let totalApi = 0;

  for (let pagina = 1; pagina <= AUTO_SYNC_MAX_PAGES; pagina++) {
    const params = new URLSearchParams({
      numeroOAB: oabNumero,
      siglaOAB: oabEstado.toUpperCase(),
      dataDisponibilizacaoInicio: dataInicio,
      pagina: String(pagina),
      qtd: String(AUTO_SYNC_PAGE_SIZE),
    });
    const res = await fetch(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`DJEN retornou ${res.status}`);
    const data = await res.json() as { count: number; items: DjenPublicacao[] };
    totalApi = data.count;
    all.push(...data.items);
    if (all.length >= totalApi || data.items.length < AUTO_SYNC_PAGE_SIZE) break;
  }

  return all;
}

export default function CrmPage() {
  const [filters, setFilters] = useState<FilterValues>({});
  const [sort, setSort] = useState<SortState>({ field: 'proximoPrazo', direction: 'asc' });
  const [state, dispatch] = useReducer(reducer, initialState);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoDetalhe | null>(null);

  // Abort controller for in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch processos ──────────────────────────────────────────────────────────

  const fetchProcessos = useCallback(async (f: FilterValues, s: SortState, cursor?: string) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const params = new URLSearchParams();
    if (f.status) params.set('status', f.status);
    if (f.area) params.set('area', f.area);
    if (f.tribunal) params.set('tribunal', f.tribunal);
    if (f.responsavel_id) params.set('responsavel_id', f.responsavel_id);
    if (f.urgencia) params.set('urgencia', '1');
    if (f.q) params.set('q', f.q);
    if (cursor) params.set('cursor', cursor);
    params.set('sort', s.field);
    params.set('order', s.direction);
    params.set('limit', '20');

    if (cursor) {
      dispatch({ type: 'LOAD_MORE_START' });
    } else {
      dispatch({ type: 'FETCH_START' });
    }

    try {
      const res = await fetch(`/api/processos?${params.toString()}`, {
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data: ApiResponse = await res.json();

      if (cursor) {
        dispatch({ type: 'LOAD_MORE_SUCCESS', payload: data });
      } else {
        dispatch({ type: 'FETCH_SUCCESS', payload: data, append: false });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      dispatch({ type: 'FETCH_ERROR', error: (err as Error).message });
    }
  }, []);

  // Initial load + re-fetch on filter/sort change
  useEffect(() => {
    fetchProcessos(filters, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort]);

  // ── Auto-sync DJEN no navegador ──────────────────────────────────────────────
  // Roda no cliente (não no servidor) porque comunicaapi.pje.jus.br bloqueia
  // IPs de datacenter. Throttle de 4h via localStorage para não repetir a cada
  // navegação entre abas do app.
  useEffect(() => {
    let cancelado = false;

    async function autoSync() {
      try {
        const ultimaAutoSync = Number(localStorage.getItem(AUTO_SYNC_STORAGE_KEY) ?? '0');
        if (Date.now() - ultimaAutoSync < AUTO_SYNC_MIN_INTERVAL_MS) return;

        const meRes = await fetch('/api/users/me');
        if (!meRes.ok) return;
        const me = await meRes.json() as { oabNumero?: string | null; oabEstado?: string | null };
        if (!me.oabNumero || !me.oabEstado) return;

        const items = await buscarDjenNoNavegador(me.oabNumero, me.oabEstado);
        if (cancelado) return;

        localStorage.setItem(AUTO_SYNC_STORAGE_KEY, String(Date.now()));
        if (items.length === 0) return;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const itemsCompactos = items.map(({ texto, ...rest }) => rest);
        const BATCH = 200;
        let totalAtualizado = 0;

        for (let i = 0; i < itemsCompactos.length; i += BATCH) {
          const lote = itemsCompactos.slice(i, i + BATCH);
          const res = await fetch('/api/processos/import-djen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: lote }),
          });
          if (!res.ok) break;
          const data = await res.json() as { total?: number };
          totalAtualizado += data.total ?? 0;
        }

        if (!cancelado && totalAtualizado > 0) {
          fetchProcessos(filters, sort);
        }
      } catch {
        // Falha silenciosa — não bloqueia o uso do CRM, o advogado ainda pode
        // sincronizar manualmente pelo botão em cada processo.
      }
    }

    autoSync();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sheet / row click ─────────────────────────────────────────────────────

  const handleRowClick = useCallback(async (processo: ProcessoRow) => {
    // Optimistic: open sheet with basic data immediately
    setSelectedProcesso({
      id: processo.id,
      numeroCnj: processo.numeroCnj,
      tribunal: processo.tribunal ?? undefined,
      areaDireito: processo.areaDireito ?? undefined,
      status: processo.status ?? undefined,
      responsavelNome: processo.responsavelNome ?? undefined,
      proximoPrazo: processo.proximoPrazo,
      ultimaMovimentacao: processo.ultimaMovimentacao,
      movimentacoes: [],
      notas: [],
      honorario: null,
    });
    setSheetOpen(true);

    // Then fetch full detail
    try {
      const res = await fetch(`/api/processos/${processo.id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedProcesso(detail);
      }
    } catch {
      // Keep the optimistic data — user can still see basic info
    }
  }, []);

  const handleAddNota = useCallback(async (processoId: string, conteudo: string) => {
    const res = await fetch(`/api/processos/${processoId}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conteudo }),
    });
    if (!res.ok) throw new Error('Falha ao adicionar nota');
    const nota = await res.json();

    setSelectedProcesso((prev) => {
      if (!prev) return prev;
      return { ...prev, notas: [nota, ...(prev.notas ?? [])] };
    });
  }, []);

  const handleDeleteNota = useCallback(async (processoId: string, notaId: string) => {
    const res = await fetch(`/api/processos/${processoId}/notas/${notaId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao remover nota');

    setSelectedProcesso((prev) => {
      if (!prev) return prev;
      return { ...prev, notas: (prev.notas ?? []).filter((n) => n.id !== notaId) };
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Título */}
      <h1
        className="text-2xl font-extrabold text-[#0f2d5e]"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        CRM de Processos
        {state.total > 0 && (
          <span className="ml-2 text-base font-normal text-[#6b7280]">
            ({state.total} processos)
          </span>
        )}
      </h1>

      {/* Filtros estilizados */}
      <ProcessoFilters filters={filters} onFilterChange={setFilters} />

      {/* Timestamp da última sync */}
      {state.lastSync && (
        <p className="text-xs text-[#6b7280] text-right">
          Última sync {state.lastSync.toLocaleDateString('pt-BR')} às{' '}
          {state.lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {/* Loading skeleton */}
      {state.loading ? (
        <div data-testid="loading-skeleton" className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-white border border-[#e5e7eb]"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <ProcessoTable
            processos={state.processos}
            sort={sort}
            onSortChange={setSort}
            onRowClick={handleRowClick}
            onLoadMore={() => state.nextCursor && fetchProcessos(filters, sort, state.nextCursor)}
            hasMore={!!state.nextCursor}
            loadingMore={state.loadingMore}
            lastSync={null}
          />

          {/* Mobile cards */}
          <div
            data-testid="mobile-cards"
            className="flex flex-col gap-3 md:hidden"
          >
            {state.processos.length === 0 ? (
              <p className="text-center text-[#6b7280] py-8 text-sm">
                Nenhum processo encontrado.
              </p>
            ) : (
              state.processos.map((p) => (
                <ProcessoCard key={p.id} processo={p} onClick={handleRowClick} />
              ))
            )}
            {state.nextCursor && (
              <button
                type="button"
                onClick={() => state.nextCursor && fetchProcessos(filters, sort, state.nextCursor)}
                disabled={state.loadingMore}
                className="py-2.5 rounded-xl border border-[#e5e7eb] bg-white text-[#0f2d5e] text-sm hover:bg-gray-50 transition-colors"
              >
                {state.loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            )}
          </div>
        </>
      )}

      <ProcessoSheet
        processo={selectedProcesso}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAddNota={handleAddNota}
        onDeleteNota={handleDeleteNota}
      />
    </div>
  );
}
