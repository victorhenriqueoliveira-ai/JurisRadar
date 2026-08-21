import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { db } from '@/db';
import { eventosAgenda } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext();
    const { id } = await params;

    const deleted = await db
      .delete(eventosAgenda)
      .where(and(eq(eventosAgenda.id, id), eq(eventosAgenda.orgId, ctx.orgId)))
      .returning({ id: eventosAgenda.id });

    if (!deleted.length) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
