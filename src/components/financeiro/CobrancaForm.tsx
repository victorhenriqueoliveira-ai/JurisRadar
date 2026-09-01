'use client';

/**
 * CobrancaForm — Formulário de cobrança pontual (boleto/Pix/ambos).
 * Consome POST /api/asaas/cobrancas e exibe link_boleto e QR Code Pix após criação.
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { criarCobrancaSchema } from '@/lib/asaas/schemas';

type CobrancaFormValues = z.infer<typeof criarCobrancaSchema>;

interface CobrancaResult {
  id: string;
  linkBoleto?: string | null;
  linkPix?: string | null;
  qrCodePix?: string | null;
  vencimento: string;
  status: string;
}

interface CobrancaFormProps {
  honorarioId?: string;
  onSuccess?: (result: CobrancaResult) => void;
}

const TIPO_LABELS: Record<string, string> = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  BOLETO_PIX: 'Boleto + Pix',
};

export function CobrancaForm({ honorarioId, onSuccess }: CobrancaFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CobrancaResult | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CobrancaFormValues>({
    resolver: zodResolver(criarCobrancaSchema),
    defaultValues: {
      honorarioId: honorarioId ?? '',
      tipo: 'BOLETO_PIX',
    },
  });

  async function onSubmit(data: CobrancaFormValues) {
    setLoading(true);
    setErrorMsg(null);
    setResultado(null);
    try {
      const res = await fetch('/api/asaas/cobrancas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as CobrancaResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `Erro ${res.status}`);
      }
      setResultado(json);
      onSuccess?.(json);
      reset({ honorarioId: honorarioId ?? '', tipo: 'BOLETO_PIX' });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar cobrança');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const errorClass = 'text-xs text-red-600 mt-1';

  return (
    <div data-testid="cobranca-form-wrapper">
      {resultado ? (
        <div data-testid="cobranca-resultado" className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">Cobrança criada com sucesso!</p>
            <p className="text-xs text-green-700 mt-0.5">Vencimento: {resultado.vencimento}</p>
          </div>

          {resultado.linkBoleto && (
            <div className="rounded-lg border border-gray-200 px-4 py-3 bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Link do Boleto</p>
              <a
                href={resultado.linkBoleto}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-boleto"
                className="text-sm text-blue-600 underline break-all"
              >
                {resultado.linkBoleto}
              </a>
            </div>
          )}

          {resultado.qrCodePix && (
            <div className="rounded-lg border border-gray-200 px-4 py-3 bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">QR Code Pix</p>
              <img
                src={resultado.qrCodePix}
                alt="QR Code Pix"
                data-testid="qrcode-pix"
                className="w-40 h-40 object-contain"
              />
            </div>
          )}

          {resultado.linkPix && !resultado.qrCodePix && (
            <div className="rounded-lg border border-gray-200 px-4 py-3 bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Link Pix</p>
              <a
                href={resultado.linkPix}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-pix"
                className="text-sm text-blue-600 underline break-all"
              >
                {resultado.linkPix}
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => setResultado(null)}
            className="w-full py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Nova cobrança
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {errors.honorarioId && (
                <p className={errorClass}>{errors.honorarioId.message}</p>
              )}
            </div>
          )}
          {honorarioId && <input type="hidden" {...register('honorarioId')} value={honorarioId} />}

          {/* Tipo */}
          <div>
            <label className={labelClass}>Tipo de cobrança</label>
            <select
              {...register('tipo')}
              className={inputClass}
              data-testid="field-tipo"
            >
              {Object.entries(TIPO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.tipo && <p className={errorClass}>{errors.tipo.message}</p>}
          </div>

          {/* Valor */}
          <div>
            <label className={labelClass}>Valor (R$)</label>
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

          {/* Vencimento */}
          <div>
            <label className={labelClass}>Vencimento</label>
            <input
              {...register('vencimento')}
              type="date"
              className={inputClass}
              data-testid="field-vencimento"
            />
            {errors.vencimento && <p className={errorClass}>{errors.vencimento.message}</p>}
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
              placeholder="Honorários advocatícios..."
              className={inputClass}
              data-testid="field-descricao"
            />
            {errors.descricao && <p className={errorClass}>{errors.descricao.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            data-testid="btn-criar-cobranca"
            className="w-full py-2 px-4 text-sm font-medium text-white bg-[#0f2d5e] rounded-md hover:bg-[#1a3f7a] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Criando cobrança…' : 'Criar cobrança'}
          </button>
        </form>
      )}
    </div>
  );
}

export default CobrancaForm;
