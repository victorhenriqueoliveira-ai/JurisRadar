'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { MovimentacaoTimeline } from './MovimentacaoTimeline';
import { NotasList, type Nota } from './NotasList';
import { type Movimentacao } from './MovimentacaoTimeline';
import { HonorarioForm, type HonorarioFormData } from '@/components/financeiro/HonorarioForm';
import { PagamentoList, type Pagamento } from '@/components/financeiro/PagamentoList';

export interface Parte {
  polo: string;
  nome: string;
}

export interface ProcessoDetalhe {
  id: string;
  numeroCnj: string;
  tribunal?: string;
  areaDireito?: string;
  status?: string;
  responsavelId?: string;
  responsavelNome?: string;
  proximoPrazo?: string | null;
  ultimaMovimentacao?: string | null;
  movimentacoes?: Movimentacao[];
  notas?: Nota[];
  partes?: Parte[] | null;
  honorario?: {
    id: string;
    valor?: number | null;
    tipo?: string | null;
    status?: string | null;
    dataPrevista?: string | null;
  } | null;
}

export interface ProcessoSheetProps {
  processo: ProcessoDetalhe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onAddNota?: (processoId: string, conteudo: string) => Promise<void>;
  onDeleteNota?: (processoId: string, notaId: string) => Promise<void>;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-BR');
}

export function ProcessoSheet({
  processo,
  open,
  onOpenChange,
  currentUserId,
  onAddNota,
  onDeleteNota,
}: ProcessoSheetProps) {
  const [activeTab, setActiveTab] = useState<'movimentacoes' | 'notas' | 'financeiro'>('movimentacoes');
  const [editingHonorario, setEditingHonorario] = useState(false);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);
  const [honorarioLocal, setHonorarioLocal] = useState(processo?.honorario ?? null);
  const [movimentacoesLocal, setMovimentacoesLocal] = useState<Movimentacao[]>(processo?.movimentacoes ?? []);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Reset tab and state when a different processo is opened
  useEffect(() => {
    if (open) {
      setActiveTab('movimentacoes');
      setEditingHonorario(false);
      setPagamentos([]);
      setHonorarioLocal(processo?.honorario ?? null);
      setMovimentacoesLocal(processo?.movimentacoes ?? []);
      setSyncError(null);
    }
  }, [open, processo?.id]);

  // Keep movimentacoesLocal in sync with processo prop when it updates
  useEffect(() => {
    setMovimentacoesLocal(processo?.movimentacoes ?? []);
  }, [processo?.movimentacoes]);

  async function handleSync() {
    if (!processo?.id) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/processos/${processo.id}/sync`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setSyncError(json.error ?? 'Erro ao sincronizar');
      } else {
        setMovimentacoesLocal(json.movimentacoes ?? []);
      }
    } catch {
      setSyncError('Erro de conexão ao sincronizar');
    } finally {
      setSyncing(false);
    }
  }

  // Sync honorario when processo changes
  useEffect(() => {
    setHonorarioLocal(processo?.honorario ?? null);
  }, [processo?.honorario]);

  // Fetch pagamentos when financeiro tab is active
  const fetchPagamentos = useCallback(async () => {
    if (!honorarioLocal?.id) return;
    setLoadingPagamentos(true);
    try {
      const res = await fetch(`/api/financeiro/honorarios/${honorarioLocal.id}/pagamentos`);
      if (res.ok) {
        const json = await res.json();
        setPagamentos(json.data ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingPagamentos(false);
    }
  }, [honorarioLocal?.id]);

  useEffect(() => {
    if (activeTab === 'financeiro' && honorarioLocal?.id) {
      fetchPagamentos();
    }
  }, [activeTab, fetchPagamentos, honorarioLocal?.id]);

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: '0.375rem 0.75rem',
    borderRadius: '0.375rem',
    border: 'none',
    background: activeTab === tab ? 'var(--jr-primary)' : 'transparent',
    color: activeTab === tab ? 'var(--jr-primary-foreground, #fff)' : 'var(--jr-primary)',
    opacity: activeTab === tab ? 1 : 0.7,
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 600 : 400,
  });

  async function handleQuickStatusChange(novoStatus: string) {
    if (!honorarioLocal || !processo?.id) return;
    const res = await fetch('/api/financeiro/honorarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        processoId: processo.id,
        tipo: honorarioLocal.tipo ?? 'Contratual',
        valor: honorarioLocal.valor ?? 0,
        dataPrevista: honorarioLocal.dataPrevista ?? undefined,
        statusPagamento: novoStatus,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setHonorarioLocal((prev) => prev ? { ...prev, status: saved.statusPagamento } : prev);
    }
  }

  async function handleSaveHonorario(data: HonorarioFormData) {
    const res = await fetch('/api/financeiro/honorarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, statusPagamento: data.statusPagamento }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? 'Erro ao salvar honorário');
    }
    const saved = await res.json();
    setHonorarioLocal({
      id: saved.id,
      valor: saved.valor != null ? Number(saved.valor) : null,
      tipo: saved.tipo,
      status: saved.statusPagamento,
      dataPrevista: saved.dataPrevista,
    });
    setEditingHonorario(false);
  }

  async function handleAddPagamento(data: { valor: number; dataPagamento: string; descricao?: string }) {
    if (!honorarioLocal?.id) return;
    const res = await fetch(`/api/financeiro/honorarios/${honorarioLocal.id}/pagamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? 'Erro ao registrar pagamento');
    }
    await fetchPagamentos();
    // Refresh honorário status
    const honorarioRes = await fetch(`/api/financeiro/honorarios?processoId=${processo?.id}`);
    if (honorarioRes.ok) {
      const json = await honorarioRes.json();
      const h = json.data?.[0];
      if (h) {
        setHonorarioLocal({
          id: h.id,
          valor: h.valor != null ? Number(h.valor) : null,
          tipo: h.tipo,
          status: h.statusPagamento,
          dataPrevista: h.dataPrevista,
        });
      }
    }
  }

  async function handleRemovePagamento(pagamentoId: string) {
    if (!honorarioLocal?.id) return;
    const res = await fetch(
      `/api/financeiro/honorarios/${honorarioLocal.id}/pagamentos?pgId=${pagamentoId}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? 'Erro ao remover pagamento');
    }
    await fetchPagamentos();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="processo-sheet"
        style={{
          top: '75px',
          height: 'calc(100vh - 75px)',
          maxWidth: '520px',
          overflow: 'hidden',
        }}
      >
        {!processo ? (
          <div style={{ padding: '1rem', color: 'var(--jr-primary)', opacity: 0.6 }}>
            Nenhum processo selecionado.
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle data-testid="sheet-numero-cnj">{processo.numeroCnj}</SheetTitle>
              <SheetDescription>
                {[processo.tribunal, processo.areaDireito, processo.status]
                  .filter(Boolean)
                  .join(' · ')}
              </SheetDescription>
              {processo.partes && processo.partes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginTop: '0.25rem' }}>
                  {['ativo', 'passivo'].map((polo) => {
                    const names = processo.partes!
                      .filter((p) => p.polo === polo)
                      .map((p) => p.nome)
                      .join(', ');
                    if (!names) return null;
                    return (
                      <p key={polo} style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--jr-primary)' }}>
                        <span style={{ opacity: 0.5, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          {polo === 'ativo' ? 'Autor' : 'Réu'}
                        </span>{' '}
                        {names}
                      </p>
                    );
                  })}
                </div>
              )}
              {processo.responsavelNome && (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--jr-primary)', opacity: 0.7 }}>
                  Responsável: {processo.responsavelNome}
                </p>
              )}
              {processo.proximoPrazo && (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--jr-danger)' }}>
                  Próximo prazo: {formatDate(processo.proximoPrazo)}
                </p>
              )}
            </SheetHeader>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0.25rem',
                padding: '0 1rem',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '0.5rem',
              }}
            >
              <button type="button" style={tabStyle('movimentacoes')} onClick={() => setActiveTab('movimentacoes')}>
                Movimentações
              </button>
              <button type="button" style={tabStyle('notas')} onClick={() => setActiveTab('notas')}>
                Notas
              </button>
              <button type="button" style={tabStyle('financeiro')} onClick={() => setActiveTab('financeiro')}>
                Financeiro
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {activeTab === 'movimentacoes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleSync}
                      disabled={syncing}
                      style={{
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        padding: '0.25rem 0.625rem',
                        fontSize: '0.75rem',
                        color: 'var(--jr-primary)',
                        cursor: syncing ? 'not-allowed' : 'pointer',
                        opacity: syncing ? 0.5 : 0.8,
                      }}
                    >
                      {syncing ? 'Sincronizando…' : 'Sincronizar DataJud'}
                    </button>
                  </div>
                  {syncError && (
                    <p style={{ color: 'var(--jr-danger)', fontSize: '0.75rem', margin: 0 }}>{syncError}</p>
                  )}
                  <MovimentacaoTimeline movimentacoes={movimentacoesLocal} />
                </div>
              )}

              {activeTab === 'notas' && (
                <NotasList
                  notas={processo.notas ?? []}
                  currentUserId={currentUserId}
                  onAddNota={onAddNota ? (conteudo) => onAddNota(processo.id, conteudo) : undefined}
                  onDeleteNota={onDeleteNota ? (notaId) => onDeleteNota(processo.id, notaId) : undefined}
                />
              )}

              {activeTab === 'financeiro' && (
                <div data-testid="financeiro-section">
                  {/* Honorário */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--jr-primary)' }}>
                        Honorário
                      </h3>
                      {!editingHonorario && (
                        <button
                          type="button"
                          onClick={() => setEditingHonorario(true)}
                          style={{
                            background: 'none',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.375rem',
                            padding: '0.25rem 0.625rem',
                            fontSize: '0.75rem',
                            color: 'var(--jr-primary)',
                            cursor: 'pointer',
                            opacity: 0.8,
                          }}
                        >
                          {honorarioLocal ? 'Editar' : '+ Registrar'}
                        </button>
                      )}
                    </div>

                    {editingHonorario ? (
                      <HonorarioForm
                        processoId={processo.id}
                        initialData={honorarioLocal ? {
                          tipo: honorarioLocal.tipo ?? undefined,
                          valor: honorarioLocal.valor,
                          dataPrevista: honorarioLocal.dataPrevista ?? undefined,
                          status: honorarioLocal.status ?? undefined,
                        } : null}
                        onSave={handleSaveHonorario}
                        onCancel={() => setEditingHonorario(false)}
                      />
                    ) : honorarioLocal ? (
                      <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0 }}>
                        {honorarioLocal.tipo && (
                          <div>
                            <dt style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6 }}>Tipo</dt>
                            <dd style={{ margin: 0, fontSize: '0.875rem', color: 'var(--jr-primary)' }}>{honorarioLocal.tipo}</dd>
                          </div>
                        )}
                        {honorarioLocal.valor != null && (
                          <div>
                            <dt style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6 }}>Valor</dt>
                            <dd style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--jr-primary)' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(honorarioLocal.valor)}
                            </dd>
                          </div>
                        )}
                        {honorarioLocal.status && (
                          <div>
                            <dt style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6, marginBottom: '0.25rem' }}>Status</dt>
                            <dd style={{ margin: 0 }}>
                              <select
                                value={honorarioLocal.status}
                                onChange={(e) => handleQuickStatusChange(e.target.value)}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.125rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  border: '1px solid #e5e7eb',
                                  background: honorarioLocal.status === 'pago' ? '#dcfce7' : honorarioLocal.status === 'parcial' ? '#fef9c3' : honorarioLocal.status === 'cancelado' ? '#f3f4f6' : '#fee2e2',
                                  color: honorarioLocal.status === 'pago' ? '#166534' : honorarioLocal.status === 'parcial' ? '#854d0e' : honorarioLocal.status === 'cancelado' ? '#6b7280' : '#991b1b',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  paddingRight: '1.5rem',
                                }}
                              >
                                <option value="pendente">Pendente</option>
                                <option value="parcial">Parcialmente pago</option>
                                <option value="pago">Pago</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            </dd>
                          </div>
                        )}
                        {honorarioLocal.dataPrevista && (
                          <div>
                            <dt style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6 }}>Vencimento</dt>
                            <dd style={{ margin: 0, fontSize: '0.875rem', color: 'var(--jr-primary)' }}>{formatDate(honorarioLocal.dataPrevista)}</dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p style={{ color: 'var(--jr-primary)', opacity: 0.5, fontSize: '0.875rem', margin: 0 }}>
                        Nenhum honorário registrado.
                      </p>
                    )}
                  </div>

                  {/* Pagamentos */}
                  {honorarioLocal && (
                    <div>
                      <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--jr-primary)' }}>
                        Pagamentos
                      </h3>
                      {loadingPagamentos ? (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--jr-primary)', opacity: 0.5 }}>Carregando...</p>
                      ) : (
                        <PagamentoList
                          pagamentos={pagamentos}
                          honorarioId={honorarioLocal.id}
                          valorTotal={honorarioLocal.valor ?? 0}
                          onAddPagamento={handleAddPagamento}
                          onRemovePagamento={handleRemovePagamento}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ProcessoSheet;
