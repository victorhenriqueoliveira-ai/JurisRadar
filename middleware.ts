import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { auth: { user?: { id?: string; orgId?: string; subscriptionStatus?: string; systemRole?: string } } | null }) => {
  const { nextUrl, auth: session } = req;
  const { pathname } = nextUrl;

  const isAutenticado = !!session;

  const isRotaPublica =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/convite') ||
    pathname === '/billing' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/inngest') ||
    pathname === '/api/billing/webhook';

  // Redireciona para login se não autenticado e rota não é pública
  if (!isRotaPublica && !isAutenticado) {
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  if (isAutenticado && !isRotaPublica) {
    const token = session?.user;

    // Rotas admin: apenas system_role = 'admin'
    if (pathname.startsWith('/admin')) {
      if (token?.systemRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', nextUrl.origin));
      }
      return NextResponse.next();
    }

    // Admin acessando rotas do app → redireciona para painel admin
    if (token?.systemRole === 'admin') {
      if (pathname === '/dashboard' || pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/admin', nextUrl.origin));
      }
    }

    // Sem orgId → usuário não completou onboarding
    if (!token?.orgId) {
      if (pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', nextUrl.origin));
      }
      return NextResponse.next();
    }

    // Verificar subscription para rotas do app
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/crm') ||
      pathname.startsWith('/busca') ||
      pathname.startsWith('/calendario') ||
      pathname.startsWith('/financeiro') ||
      pathname.startsWith('/notificacoes') ||
      pathname.startsWith('/configuracoes')
    ) {
      const status = token?.subscriptionStatus;
      if (!status || !['trialing', 'active'].includes(status)) {
        return NextResponse.redirect(new URL('/billing', nextUrl.origin));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
};
