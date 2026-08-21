'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ConviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [estado, setEstado] = useState<'carregando' | 'formulario' | 'erro' | 'sucesso'>('carregando');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) {
      setEstado('erro');
      setErro('Token de convite não encontrado na URL.');
      return;
    }

    fetch(`/api/auth/convite?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setEstado('erro');
          setErro(data.error);
        } else {
          setEmail(data.email);
          setName(data.name ?? '');
          setEstado('formulario');
        }
      })
      .catch(() => {
        setEstado('erro');
        setErro('Não foi possível validar o convite. Tente novamente.');
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const res = await fetch('/api/auth/convite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao aceitar convite.');
        return;
      }

      // Login automático
      const result = await signIn('credentials', {
        email: data.email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push('/login');
        return;
      }

      router.push('/dashboard');
    } catch {
      setErro('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0f2d5e] text-white flex items-center justify-center font-extrabold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</div>
              <span className="font-extrabold text-lg text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Aceitar convite</h1>
            <p className="mt-1 text-sm text-gray-500">Configure sua conta para acessar o escritório.</p>
          </div>

          {estado === 'carregando' && (
            <p className="text-center text-sm text-gray-500 py-6">Validando convite...</p>
          )}

          {estado === 'erro' && (
            <div className="text-center py-4">
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{erro}</p>
              </div>
              <Link href="/login" className="text-[#0f2d5e] text-sm font-semibold hover:underline">
                Ir para o login
              </Link>
            </div>
          )}

          {estado === 'formulario' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Seu nome *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="João da Silva"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                  disabled={enviando}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Crie uma senha * (mín. 8 caracteres)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                  disabled={enviando}
                />
              </div>

              {erro && (
                <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{erro}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#0f2d5e] hover:bg-[#1a4a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {enviando ? 'Entrando...' : 'Aceitar convite e entrar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConvitePage() {
  return (
    <Suspense>
      <ConviteContent />
    </Suspense>
  );
}
