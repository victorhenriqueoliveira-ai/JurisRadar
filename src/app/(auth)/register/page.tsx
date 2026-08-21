'use client';

import { useState, FormEvent, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    cpf: '',
    oabEstado: 'SP',
    oabNumero: '',
    escritorioNome: '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao criar conta.');
        return;
      }

      // Login automático após cadastro
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setErro('Conta criada, mas não foi possível entrar automaticamente. Acesse o login.');
        router.push('/login');
        return;
      }

      router.push('/onboarding');
    } catch {
      setErro('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#0f2d5e] text-white flex items-center justify-center font-extrabold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</div>
              <span className="font-extrabold text-lg text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Crie sua conta</h1>
            <p className="mt-1 text-sm text-gray-500">14 dias grátis, sem cartão de crédito.</p>
          </div>

          {erro && (
            <div role="alert" className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{erro}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome completo *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={set('name')}
                  placeholder="João da Silva"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                  disabled={carregando}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={set('email')}
                  placeholder="joao@escritorio.com.br"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                  disabled={carregando}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Senha * (mín. 8 caracteres)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                  disabled={carregando}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={set('cpf')}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                  disabled={carregando}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">OAB</label>
                <div className="flex gap-2">
                  <select
                    value={form.oabEstado}
                    onChange={set('oabEstado')}
                    className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                    disabled={carregando}
                  >
                    {UF_LIST.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.oabNumero}
                    onChange={set('oabNumero')}
                    placeholder="123456"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                    disabled={carregando}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do escritório (opcional)</label>
                <input
                  type="text"
                  value={form.escritorioNome}
                  onChange={set('escritorioNome')}
                  placeholder="Silva & Associados Advocacia"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50"
                  disabled={carregando}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#0f2d5e] hover:bg-[#1a4a8a] focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {carregando ? 'Criando conta...' : 'Criar conta grátis'}
            </button>

            <p className="text-center text-xs text-gray-500">
              Já tem conta?{' '}
              <Link href="/login" className="text-[#0f2d5e] font-semibold hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
