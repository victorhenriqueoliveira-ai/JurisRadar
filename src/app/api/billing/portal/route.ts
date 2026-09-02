import { NextResponse } from 'next/server'

export async function GET() {
  // Asaas não possui portal do cliente hospedado.
  // Redireciona para a página interna de configurações de assinatura.
  return NextResponse.redirect(
    new URL('/configuracoes/billing', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  )
}
