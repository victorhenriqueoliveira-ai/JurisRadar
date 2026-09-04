import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { db } from '@/db';
import { eventosCalendario, eventosAgenda } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext();
    const { id } = await params;
    const body = (await request.json()) as Record<string, string>;
    const { fonte, tipo, data, titulo, descricao, horaInicio, horaFim, responsavelId } = body;

    if (!fonte || !['calendario', 'agenda'].includes(fonte)) {
      return NextResponse.json(
        { error: "Campo 'fonte' deve ser 'calendario' ou 'agenda'." },
        { status: 400 },
      );
    }

    if (tipo === 'prazo_fatal' && data && data < hoje()) {
      return NextResponse.json(
        { error: 'Prazo fatal não pode ser movido para data passada.' },
        { status: 422 },
      );
    }

    if (fonte === 'calendario') {
      const updated = await db
        .update(eventosCalendario)
        .set({
          ...(titulo && { titulo: titulo.trim() }),
          ...(data && { data }),
          ...(tipo && { tipo }),
          ...(horaInicio !== undefined && { horaInicio }),
          ...(horaFim !== undefined && { horaFim }),
          ...(responsavelId !== undefined && { responsavelId }),
        })
        .where(and(eq(eventosCalendario.id, id), eq(eventosCalendario.orgId, ctx.orgId)))
        .returning({ id: eventosCalendario.id });

      if (!updated.length) {
        return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, fonte: 'calendario' });
    }

    const updated = await db
      .update(eventosAgenda)
      .set({
        ...(titulo && { titulo: titulo.trim() }),
        ...(data && { data }),
        ...(tipo && { tipo }),
        ...(descricao !== undefined && { descricao }),
        ...(horaInicio !== undefined && { horaInicio }),
        ...(horaFim !== undefined && { horaFim }),
        ...(responsavelId !== undefined && { responsavelId }),
      })
      .where(and(eq(eventosAgenda.id, id), eq(eventosAgenda.orgId, ctx.orgId)))
      .returning({ id: eventosAgenda.id });

    if (!updated.length) {
      return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, fonte: 'agenda' });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext();
    const { id } = await params;
    const fonte = request.nextUrl.searchParams.get('fonte') ?? 'agenda';

    if (!['calendario', 'agenda'].includes(fonte)) {
      return NextResponse.json(
        { error: "Parâmetro 'fonte' deve ser 'calendario' ou 'agenda'." },
        { status: 400 },
      );
    }

    if (fonte === 'calendario') {
      const deleted = await db
        .delete(eventosCalendario)
        .where(and(eq(eventosCalendario.id, id), eq(eventosCalendario.orgId, ctx.orgId)))
        .returning({ id: eventosCalendario.id });

      if (!deleted.length) {
        return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    const deleted = await db
      .delete(eventosAgenda)
      .where(and(eq(eventosAgenda.id, id), eq(eventosAgenda.orgId, ctx.orgId)))
      .returning({ id: eventosAgenda.id });

    if (!deleted.length) {
      return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
