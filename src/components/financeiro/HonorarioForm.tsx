'use client';

import React, { useState } from 'react';

export interface HonorarioFormData {
  processoId: string;
  tipo: string;
  valor: number;
  dataPrevista?: string;
}

interface HonorarioFormProps {
  processoId: string;
  initialData?: {
    tipo?: string;
    valor?: number | null;
    dataPrevista?: string | null;
  } | null;
  onSave?: (data: HonorarioFormData) => Promise<void>;
  onCancel?: () => void;
}

const TIPOS_HONORARIO = [
  'Contratual',
  'Êxito',
  'Consultoria',
  'Audiência',
  'Mensal',
  'Outro',
];

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * HonorarioForm — formulário inline para registro/edição de honorário.
 * Usado no painel lateral do processo (ProcessoSheet).
 */
export function HonorarioForm({
  processoId,
  initialData,
  onSave,
  onCancel,
}: HonorarioFormProps) {
  const [tipo, setTipo] = useState(initialData?.tipo ?? 'Contratual');
  const [valorStr, setValorStr] = useState(
    initialData?.valor != null ? String(initialData.valor) : '',
  );
  const [dataPrevista, setDataPrevista] = useState(
    initialData?.dataPrevista ?? '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const valorNum = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valorNum) || valorNum < 0) {
      setError('Informe um valor válido (maior ou igual a 0).');
      return;
    }

    try {
      setLoading(true);
      await onSave?.({
        processoId,
        tipo,
        valor: valorNum,
        dataPrevista: dataPrevista || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar honorário.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--jr-glass-border)',
    borderRadius: '0.375rem',
    background: 'var(--jr-glass-bg)',
    color: 'var(--jr-primary)',
    fontSize: '0.875rem',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--jr-primary)',
    opacity: 0.7,
    marginBottom: '0.25rem',
    display: 'block',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div>
        <label htmlFor="honorario-tipo" style={labelStyle}>
          Tipo
        </label>
        <select
          id="honorario-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          style={inputStyle}
          required
        >
          {TIPOS_HONORARIO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="honorario-valor" style={labelStyle}>
          Valor (R$)
        </label>
        <input
          id="honorario-valor"
          type="number"
          min="0"
          step="0.01"
          value={valorStr}
          onChange={(e) => setValorStr(e.target.value)}
          placeholder="Ex: 5000.00"
          style={inputStyle}
          required
        />
      </div>

      <div>
        <label htmlFor="honorario-data" style={labelStyle}>
          Data de vencimento
        </label>
        <input
          id="honorario-data"
          type="date"
          value={dataPrevista}
          onChange={(e) => setDataPrevista(e.target.value)}
          style={inputStyle}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--jr-danger)', fontSize: '0.8125rem', margin: 0 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--jr-glass-border)',
              borderRadius: '0.375rem',
              background: 'transparent',
              color: 'var(--jr-primary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '0.375rem',
            background: 'var(--jr-primary)',
            color: 'var(--jr-primary-foreground, #fff)',
            fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontWeight: 600,
          }}
        >
          {loading ? 'Salvando...' : 'Salvar honorário'}
        </button>
      </div>

      {initialData?.valor != null && (
        <p style={{ fontSize: '0.75rem', color: 'var(--jr-primary)', opacity: 0.5, margin: 0, textAlign: 'right' }}>
          Valor atual: {formatCurrency(initialData.valor)}
        </p>
      )}
    </form>
  );
}

export default HonorarioForm;
