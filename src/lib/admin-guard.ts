import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id || session.user.systemRole !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  return { userId: session.user.id };
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
