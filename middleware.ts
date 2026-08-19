import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { auth: { user?: { id?: string; orgId?: string; subscriptionStatus?: string } } | null }) => {
  const { nextUrl, auth: session } = req;
  const { pathname } = nextUrl;

  const isAutenticado = !!session;

  const isRotaPublica =
    pathname === '/login' ||
    pathname === '/onboarding' ||
    pathname === '/billing' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/inngest');

  // Redireciona para login se não autenticado e rota não é pública
  if (!isRotaPublica && !isAutenticado) {
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // Lógica para usuários autenticados em rotas protegidas
  if (isAutenticado && !isRotaPublica) {
    const token = session?.user;

    // Sem orgId → usuário não completou onboarding
    if (!token?.orgId) {
      return NextResponse.redirect(new URL('/onboarding', nextUrl.origin));
    }

    // Verificar subscription para rotas do app
    if (pathname.startsWith('/app') || pathname.startsWith('/(app)')) {
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
    /*
     * Protege todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico
     * - arquivos com extensão (imagens, fontes, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
};
