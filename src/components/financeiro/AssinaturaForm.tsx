'use client';

/**
 * AssinaturaForm — Formulário de assinatura recorrente.
 * Consome POST /api/asaas/assinaturas.
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { criarAssinaturaSchema } from '@/lib/asaas/schemas';

type AssinaturaFormValues = z.infer<typeof criarAssinaturaSchema>;

interface AssinaturaResult {
  id: string;
  status: string;
}

interface AssinaturaFormProps {
  honorarioId?: string;
  onSuccess?: (result: AssinaturaResult) => void;
}

const CICLO_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUALLY: 'Semestral',
  ANNUALLY: 'Anual',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function AssinaturaForm({ honorarioId, onSuccess }: AssinaturaFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssinaturaFormValues>({
    resolver: zodResolver(criarAssinaturaSchema),
    defaultValues: {
      honorarioId: honorarioId ?? '',
      ciclo: 'MONTHLY',
    },
  });

  const valorWatch = watch('valor');
  const parcelasWatch = watch('totalParcelas');

  async function onSubmit(data: AssinaturaFormValues) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/asaas/assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as AssinaturaResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `Erro ${res.status}`);
      }
      setSucesso(true);
      onSuccess?.(json);
      reset({ honorarioId: honorarioId ?? '', ciclo: 'MONTHLY' });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar assinatura');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const errorClass = 'text-xs text-red-600 mt-1';

  if (sucesso) {
    return (
      <div data-testid="assinatura-sucesso" className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 space-y-3">
        <p className="text-sm font-semibold text-green-800">Assinatura criada com sucesso!</p>
        <button
          type="button"
          onClick={() => setSucesso(false)}
          className="w-full py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Nova assinatura
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="assinatura-form"
    >
      {errorMsg && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {/* honorarioId (oculto se já fornecido via prop) */}
      {!honorarioId && (
        <div>
          <label className={labelClass}>ID do Honorário</label>
          <input
            {...register('honorarioId')}
            type="text"
            placeholder="UUID do honorário"
            className={inputClass}
            data-testid="field-honorario-id"
          />
          {errors.honorarioId && <p className={errorClass}>{errors.honorarioId.message}</p>}
        </div>
      )}
      {honorarioId && <input type="hidden" {...register('honorarioId')} value={honorarioId} />}

      {/* Ciclo */}
      <div>
        <label className={labelClass}>Ciclo de cobrança</label>
        <select
          {...register('ciclo')}
          className={inputClass}
          data-testid="field-ciclo"
        >
          {Object.entries(CICLO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {errors.ciclo && <p className={errorClass}>{errors.ciclo.message}</p>}
      </div>

      {/* Valor por parcela */}
      <div>
        <label className={labelClass}>Valor por parcela (R$)</label>
        <input
          {...register('valor', { valueAsNumber: true })}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          className={inputClass}
          data-testid="field-valor"
        />
        {errors.valor && <p className={errorClass}>{errors.valor.message}</p>}
      </div>

      {/* Número de parcelas */}
      <div>
        <label className={labelClass}>
          Número de parcelas <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          {...register('totalParcelas', { setValueAs: (v: string) => v === '' ? undefined : parseInt(v, 10) })}
          type="number"
          min="1"
          step="1"
          placeholder="12"
          className={inputClass}
          data-testid="field-parcelas"
        />
        {errors.totalParcelas && <p className={errorClass}>{errors.totalParcelas.message}</p>}
      </div>

      {/* Resumo */}
      {valorWatch > 0 && parcelasWatch && parcelasWatch > 0 && (
        <div
          data-testid="resumo-assinatura"
          className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800"
        >
          <span className="font-semibold">{parcelasWatch}x {formatCurrency(valorWatch)}</span>
          {' '}— Total: {formatCurrency(valorWatch * parcelasWatch)}
        </div>
      )}

      {/* Data de início */}
      <div>
        <label className={labelClass}>Data da primeira cobrança</label>
        <input
          {...register('dataInicio')}
          type="date"
          className={inputClass}
          data-testid="field-data-inicio"
        />
        {errors.dataInicio && <p className={errorClass}>{errors.dataInicio.message}</p>}
      </div>

      {/* Nome do cliente */}
      <div>
        <label className={labelClass}>Nome do cliente</label>
        <input
          {...register('clienteNome')}
          type="text"
          placeholder="Nome completo"
          className={inputClass}
          data-testid="field-cliente-nome"
        />
        {errors.clienteNome && <p className={errorClass}>{errors.clienteNome.message}</p>}
      </div>

      {/* E-mail do cliente */}
      <div>
        <label className={labelClass}>E-mail do cliente</label>
        <input
          {...register('clienteEmail')}
          type="email"
          placeholder="email@exemplo.com"
          className={inputClass}
          data-testid="field-cliente-email"
        />
        {errors.clienteEmail && <p className={errorClass}>{errors.clienteEmail.message}</p>}
      </div>

      {/* CPF/CNPJ */}
      <div>
        <label className={labelClass}>CPF/CNPJ do cliente</label>
        <input
          {...register('clienteCpfCnpj')}
          type="text"
          placeholder="000.000.000-00"
          className={inputClass}
          data-testid="field-cliente-cpf-cnpj"
        />
        {errors.clienteCpfCnpj && <p className={errorClass}>{errors.clienteCpfCnpj.message}</p>}
      </div>

      {/* Descrição */}
      <div>
        <label className={labelClass}>Descrição</label>
        <input
          {...register('descricao')}
          type="text"
          placeholder="Honorários advocatícios mensais..."
          className={inputClass}
          data-testid="field-descricao"
        />
        {errors.descricao && <p className={errorClass}>{errors.descricao.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        data-testid="btn-criar-assinatura"
        className="w-full py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-md hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors"
      >
        {loading ? 'Criando assinatura…' : 'Criar assinatura'}
      </button>
    </form>
  );
}

export default AssinaturaForm;
