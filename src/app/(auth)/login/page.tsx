'use client';

import { useState, FormEvent, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Scale, Zap, Eye, EyeOff } from 'lucide-react';

const FEATURES = [
  { icon: Scale, text: 'Monitore processos e prazos em tempo real' },
  { icon: Zap, text: 'Busca em DataJud, DJe TJSP e DJEN Nacional' },
  { icon: ShieldCheck, text: 'Alertas automáticos de movimentações' },
];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [step, setStep] = useState<'login' | 'totp'>('login');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        ...(step === 'totp' ? { totpCode } : {}),
        redirect: false,
      });

      if (result?.error === 'TOTP_REQUIRED') {
        setStep('totp');
        setCarregando(false);
        return;
      }

      if (result?.error) {
        setErro(
          result.error === 'TOTP_INVALID'
            ? 'Código 2FA inválido. Verifique o aplicativo autenticador.'
            : 'E-mail ou senha inválidos.'
        );
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErro('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — brand */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12"
        style={{ background: 'linear-gradient(155deg, #0f2d5e 0%, #1a4a8a 60%, #0f2d5e 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <span className="text-white font-extrabold text-[15px]" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</span>
          </div>
          <span className="text-white font-extrabold text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
        </div>

        {/* Headline */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Gestão jurídica<br />inteligente para<br />advogados modernos.
            </h1>
            <p className="mt-4 text-[#93b8e8] text-lg leading-relaxed">
              Automatize o monitoramento de processos e nunca perca um prazo.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[#c8ddf5] text-sm font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé */}
        <p className="text-[#6b9fd4] text-xs">
          © {new Date().getFullYear()} JurisRadar · Todos os direitos reservados
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-[#f8fafc]">
        {/* Logo mobile */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-9 h-9 rounded-xl bg-[#0f2d5e] flex items-center justify-center">
            <span className="text-white font-extrabold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</span>
          </div>
          <span className="text-[#0f2d5e] font-extrabold text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {step === 'totp' ? 'Verificação em duas etapas' : 'Bem-vindo de volta'}
            </h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              {step === 'totp'
                ? 'Insira o código do seu aplicativo autenticador.'
                : 'Acesse sua conta para continuar.'}
            </p>
          </div>

          {erro && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{erro}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'login' && (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[#374151] mb-1.5">
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com.br"
                    disabled={carregando}
                    className="w-full px-4 py-2.5 border border-[#d1d5db] rounded-xl text-sm text-[#111827] placeholder-[#9ca3af] bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-semibold text-[#374151]">
                      Senha
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={carregando}
                      className="w-full px-4 py-2.5 pr-10 border border-[#d1d5db] rounded-xl text-sm text-[#111827] placeholder-[#9ca3af] bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 'totp' && (
              <div>
                <label htmlFor="totpCode" className="block text-sm font-semibold text-[#374151] mb-1.5">
                  Código de autenticação
                </label>
                <input
                  id="totpCode"
                  name="totpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  disabled={carregando}
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-xl text-2xl text-center font-mono tracking-[0.5em] text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d5e]/30 focus:border-[#0f2d5e] disabled:opacity-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => { setStep('login'); setTotpCode(''); setErro(null); }}
                  className="mt-2 text-xs text-[#6b7280] hover:text-[#0f2d5e] transition-colors"
                >
                  ← Voltar para o login
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #0f2d5e 0%, #1a4a8a 100%)' }}
            >
              {carregando
                ? 'Entrando...'
                : step === 'totp'
                  ? 'Verificar'
                  : 'Entrar'}
            </button>
            <p className="text-center text-xs text-[#6b7280] pt-1">
              <Link href="/forgot-password" className="font-bold text-[#0f2d5e] hover:underline">
                Esqueceu sua senha?
              </Link>
            </p>

            {step === 'login' && (
              <p className="text-center text-sm text-[#6b7280] pt-1">
                Não tem conta?{' '}
                <Link href="/register" className="font-bold text-[#0f2d5e] hover:underline">
                  Criar conta grátis
                </Link>
              </p>
            )}
          </form>
          <p className="text-center text-xs text-[#6b7280] pt-1">
            <Link href="/" className="font-bold text-[#0f2d5e] hover:underline">
              Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
