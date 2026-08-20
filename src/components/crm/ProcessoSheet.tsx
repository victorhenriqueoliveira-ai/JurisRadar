'use client';

import React, { useEffect, useState } from 'react';
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
  honorario?: {
    id: string;
    valor?: number | null;
    tipo?: string | null;
    status?: string | null;
  } | null;
}

interface ProcessoSheetProps {
  processo: ProcessoDetalhe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onAddNota?: (processoId: string, conteudo: string) => Promise<void>;
  onDeleteNota?: (processoId: string, notaId: string) => Promise<void>;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
  const [activeTab, setActiveTab] = useState<'movimentacoes' | 'notas' | 'honorario'>('movimentacoes');

  // Reset tab when a different processo is opened
  useEffect(() => {
    if (open) setActiveTab('movimentacoes');
  }, [open, processo?.id]);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" data-testid="processo-sheet">
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
                borderBottom: '1px solid var(--jr-glass-border)',
                paddingBottom: '0.5rem',
              }}
            >
              <button type="button" style={tabStyle('movimentacoes')} onClick={() => setActiveTab('movimentacoes')}>
                Movimentações
              </button>
              <button type="button" style={tabStyle('notas')} onClick={() => setActiveTab('notas')}>
                Notas
              </button>
              <button type="button" style={tabStyle('honorario')} onClick={() => setActiveTab('honorario')}>
                Honorário
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {activeTab === 'movimentacoes' && (
                <MovimentacaoTimeline movimentacoes={processo.movimentacoes ?? []} />
              )}

              {activeTab === 'notas' && (
                <NotasList
                  notas={processo.notas ?? []}
                  currentUserId={currentUserId}
                  onAddNota={onAddNota ? (conteudo) => onAddNota(processo.id, conteudo) : undefined}
                  onDeleteNota={onDeleteNota ? (notaId) => onDeleteNota(processo.id, notaId) : undefined}
                />
              )}

              {activeTab === 'honorario' && (
                <div data-testid="honorario-section">
                  {processo.honorario ? (
                    <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <dt style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6 }}>Valor</dt>
                        <dd style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--jr-primary)' }}>
                          {formatCurrency(processo.honorario.valor)}
                        </dd>
                      </div>
                      {processo.honorario.tipo && (
                        <div>
                          <dt style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6 }}>Tipo</dt>
                          <dd style={{ margin: 0, fontSize: '0.875rem', color: 'var(--jr-primary)' }}>
                            {processo.honorario.tipo}
                          </dd>
                        </div>
                      )}
                      {processo.honorario.status && (
                        <div>
                          <dt style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.6 }}>Status</dt>
                          <dd style={{ margin: 0, fontSize: '0.875rem', color: 'var(--jr-primary)' }}>
                            {processo.honorario.status}
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p style={{ color: 'var(--jr-primary)', opacity: 0.6, fontSize: '0.875rem' }}>
                      Nenhum honorário registrado.
                    </p>
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
