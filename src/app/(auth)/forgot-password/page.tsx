'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao processar solicitação.');
        return;
      }
      setEnviado(true);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6fb] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e5e7eb] p-8 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#0f2d5e] flex items-center justify-center">
              <span className="text-white font-extrabold text-xs" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</span>
            </div>
            <span className="font-extrabold text-[#0f2d5e] text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#111827]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Recuperar senha
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Informe seu e-mail para receber o link de redefinição.
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              Se esse e-mail estiver cadastrado, você receberá as instruções em breve. Verifique também a caixa de spam.
            </div>
            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-[#0f2d5e] hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.04em] text-[#9ca3af] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3.5 py-2.5 border border-[#e5e7eb] rounded-xl text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 focus:border-[#0f2d5e] transition-colors placeholder-[#9ca3af]"
              />
            </div>

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 bg-[#0f2d5e] text-white font-semibold text-sm rounded-xl hover:bg-[#1a4a8a] disabled:opacity-60 transition-colors"
            >
              {carregando ? 'Enviando…' : 'Enviar link de redefinição'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-[#9ca3af] hover:text-[#374151] transition-colors"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
