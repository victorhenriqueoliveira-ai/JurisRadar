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
    <main style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--jr-primary)' }}>
        CRM de Processos
        {state.total > 0 && (
          <span style={{ marginLeft: '0.5rem', fontSize: '1rem', fontWeight: 400, opacity: 0.6 }}>
            ({state.total} processos)
          </span>
        )}
      </h1>

      <ProcessoFilters filters={filters} onFilterChange={setFilters} />

      {state.error && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: 'var(--jr-danger)',
            color: 'var(--jr-danger-foreground)',
            fontSize: '0.875rem',
          }}
        >
          {state.error}
        </div>
      )}

      {state.loading ? (
        <div data-testid="loading-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '2.5rem',
                borderRadius: '0.375rem',
                background: 'var(--jr-glass-bg)',
                border: '1px solid var(--jr-glass-border)',
                animation: 'jr-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table — hidden on mobile */}
          <ProcessoTable
            processos={state.processos}
            sort={sort}
            onSortChange={setSort}
            onRowClick={handleRowClick}
            onLoadMore={() => state.nextCursor && fetchProcessos(filters, sort, state.nextCursor)}
            hasMore={!!state.nextCursor}
            loadingMore={state.loadingMore}
            lastSync={state.lastSync}
          />

          {/* Mobile cards — hidden on desktop */}
          <div
            data-testid="mobile-cards"
            className="block md:hidden"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {state.processos.length === 0 ? (
              <p style={{ color: 'var(--jr-primary)', opacity: 0.6, textAlign: 'center', padding: '2rem 0' }}>
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
                style={{
                  padding: '0.625rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--jr-glass-border)',
                  background: 'var(--jr-glass-bg)',
                  color: 'var(--jr-primary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
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
    </main>
  );
}
