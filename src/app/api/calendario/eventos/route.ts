import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { db } from '@/db';
import { eventosAgenda } from '@/db/schema';
import { and, eq, gte, lte, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgContext();
    const { searchParams } = request.nextUrl;
    const de = searchParams.get('de');
    const ate = searchParams.get('ate');

    const conditions = [eq(eventosAgenda.orgId, ctx.orgId)];
    if (de) conditions.push(gte(eventosAgenda.data, de));
    if (ate) conditions.push(lte(eventosAgenda.data, ate));

    const eventos = await db
      .select()
      .from(eventosAgenda)
      .where(and(...conditions))
      .orderBy(asc(eventosAgenda.data));

    return NextResponse.json({ data: eventos });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrgContext();
    const body = await request.json() as {
      titulo?: string;
      descricao?: string;
      data?: string;
      horaInicio?: string;
      horaFim?: string;
      tipo?: string;
    };

    if (!body.titulo?.trim()) {
      return NextResponse.json({ error: 'título é obrigatório' }, { status: 400 });
    }
    if (!body.data || !/^\d{4}-\d{2}-\d{2}$/.test(body.data)) {
      return NextResponse.json({ error: 'data inválida (use YYYY-MM-DD)' }, { status: 400 });
    }

    const [evento] = await db
      .insert(eventosAgenda)
      .values({
        orgId: ctx.orgId,
        titulo: body.titulo.trim(),
        descricao: body.descricao?.trim() ?? null,
        data: body.data,
        horaInicio: body.horaInicio ?? null,
        horaFim: body.horaFim ?? null,
        tipo: body.tipo ?? 'pessoal',
      })
      .returning();

    return NextResponse.json(evento, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
