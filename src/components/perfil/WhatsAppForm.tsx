'use client';

/**
 * Formulário de configuração do WhatsApp nas configurações de perfil.
 *
 * - Formato exibido: +55 (DD) NNNNN-NNNN
 * - Validação E.164 no cliente antes de submeter (reutiliza isNumeroE164Valido de zenvia/phone.ts)
 * - Aviso claro sobre uso para alertas de intimações críticas
 * - Endpoint: PATCH /api/perfil/contato
 */

import { useState } from 'react';
import { isNumeroE164Valido } from '@/lib/zenvia/phone';

interface WhatsAppFormProps {
  /** Número atual salvo no banco (formato E.164 ou null) */
  whatsappAtual?: string | null;
}

/**
 * Normaliza entrada do usuário para E.164 removendo formatação visual.
 * Ex: "+55 (11) 99999-9999" → "+5511999999999"
 */
function normalizarInput(valor: string): string {
  // Mantém apenas dígitos e o + inicial
  return valor.replace(/[^\d+]/g, '');
}

export function WhatsAppForm({ whatsappAtual }: WhatsAppFormProps) {
  const [numero, setNumero] = useState(whatsappAtual ?? '');
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setNumero(valor);
    setErroValidacao(null);
    setSucesso(false);
    setErroServidor(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSucesso(false);
    setErroServidor(null);

    const normalizado = normalizarInput(numero);

    if (!isNumeroE164Valido(normalizado)) {
      setErroValidacao(
        'Número inválido. Use o formato +55 (DD) NNNNN-NNNN, ex: +55 (11) 99999-9999.',
      );
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/perfil/contato', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_numero: normalizado }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErroServidor(data.error ?? 'Erro ao salvar. Tente novamente.');
        return;
      }

      setSucesso(true);
      setNumero(normalizado);
    } catch {
      setErroServidor('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-4">
        {/* Aviso sobre importância do WhatsApp */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">
            <strong>Atenção:</strong> O número de WhatsApp é necessário para receber alertas de
            intimações críticas.
          </p>
        </div>

        {/* Campo WhatsApp */}
        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium mb-1">
            WhatsApp <span className="text-destructive">*</span>
          </label>
          <input
            id="whatsapp"
            type="tel"
            value={numero}
            onChange={handleChange}
            placeholder="+55 (11) 99999-9999"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            aria-required="true"
            aria-describedby={erroValidacao ? 'whatsapp-erro' : undefined}
          />
          {erroValidacao && (
            <p id="whatsapp-erro" role="alert" className="mt-1 text-xs text-destructive">
              {erroValidacao}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Formato: +55 (DD) NNNNN-NNNN
          </p>
        </div>

        {/* Feedback servidor */}
        {erroServidor && (
          <p role="alert" className="text-sm text-destructive">
            {erroServidor}
          </p>
        )}

        {sucesso && (
          <p role="status" className="text-sm text-green-700">
            WhatsApp salvo com sucesso.
          </p>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {salvando ? 'Salvando...' : 'Salvar WhatsApp'}
        </button>
      </div>
    </form>
  );
}
