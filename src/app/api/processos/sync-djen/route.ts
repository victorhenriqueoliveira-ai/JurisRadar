import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { syncDjenPorOab } from '@/lib/djen/sync';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrgContext();

    const body = await request.json().catch(() => ({})) as {
      oabNumero?: string;
      oabEstado?: string;
    };

    let oabNumero = body.oabNumero?.trim();
    let oabEstado = body.oabEstado?.trim();

    // Fallback: lê do perfil do usuário
    if (!oabNumero || !oabEstado) {
      const [user] = await db
        .select({ oabNumero: users.oabNumero, oabEstado: users.oabEstado })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      oabNumero = oabNumero || user?.oabNumero || '';
      oabEstado = oabEstado || user?.oabEstado || '';
    }

    if (!oabNumero || !oabEstado) {
      return NextResponse.json({ error: 'OAB número e estado são obrigatórios' }, { status: 400 });
    }

    const resultado = await syncDjenPorOab(ctx.orgId, oabNumero, oabEstado);

    return NextResponse.json({
      processosNovos: resultado.processosNovos,
      processosAtualizados: resultado.processosAtualizados,
      publicacoes: resultado.publicacoesTotal,
      total: resultado.processosNovos + resultado.processosAtualizados,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/processos/sync-djen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
