'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Link inválido. Solicite um novo link de redefinição.
        </div>
        <Link href="/forgot-password" className="block text-center text-sm font-semibold text-[#0f2d5e] hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    if (novaSenha !== confirmaSenha) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (novaSenha.length < 8) {
      setErro('A senha deve ter ao menos 8 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao redefinir senha.');
        return;
      }
      setSucesso(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
        Senha redefinida com sucesso! Redirecionando para o login…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[.04em] text-[#9ca3af] mb-1.5">
          Nova senha
        </label>
        <div className="relative">
          <input
            type={showSenha ? 'text' : 'password'}
            required
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="w-full px-3.5 py-2.5 pr-10 border border-[#e5e7eb] rounded-xl text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/20 focus:border-[#0f2d5e] transition-colors placeholder-[#9ca3af]"
          />
          <button
            type="button"
            onClick={() => setShowSenha((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]"
            tabIndex={-1}
          >
            {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[.04em] text-[#9ca3af] mb-1.5">
          Confirmar nova senha
        </label>
        <input
          type={showSenha ? 'text' : 'password'}
          required
          value={confirmaSenha}
          onChange={(e) => setConfirmaSenha(e.target.value)}
          placeholder="Repita a senha"
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
        {carregando ? 'Salvando…' : 'Redefinir senha'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            Redefinir senha
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        <Suspense fallback={<div className="text-sm text-[#9ca3af]">Carregando…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
