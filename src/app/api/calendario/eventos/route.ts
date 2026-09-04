import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { db } from '@/db';
import { eventosCalendario, eventosAgenda } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrgContext();
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Parâmetros start e end são obrigatórios.' },
        { status: 400 },
      );
    }

    const tipo = searchParams.get('tipo');
    const responsavelId = searchParams.get('responsavelId');

    const result = await db.execute(sql`
      SELECT * FROM v_eventos_calendario
      WHERE org_id = ${ctx.orgId}::uuid
        AND data >= ${start}::date
        AND data <= ${end}::date
        ${tipo ? sql`AND tipo = ${tipo}` : sql``}
        ${responsavelId ? sql`AND responsavel_id = ${responsavelId}::uuid` : sql``}
      ORDER BY data ASC, hora_inicio ASC NULLS LAST
    `);

    return NextResponse.json({ data: result.rows });
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
    const body = (await request.json()) as Record<string, string>;
    const { titulo, data, tipo, processoId, descricao, horaInicio, horaFim, responsavelId } = body;

    if (!titulo?.trim()) {
      return NextResponse.json({ error: 'titulo é obrigatório.' }, { status: 400 });
    }
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return NextResponse.json({ error: 'data inválida (use YYYY-MM-DD).' }, { status: 400 });
    }

    if (processoId) {
      const [evento] = await db
        .insert(eventosCalendario)
        .values({
          orgId: ctx.orgId,
          processoId,
          titulo: titulo.trim(),
          data,
          tipo: tipo ?? 'tarefa',
          horaInicio: horaInicio ?? null,
          horaFim: horaFim ?? null,
          responsavelId: responsavelId ?? null,
          origem: 'manual',
        })
        .returning();
      return NextResponse.json({ ...evento, fonte: 'calendario' }, { status: 201 });
    }

    const [evento] = await db
      .insert(eventosAgenda)
      .values({
        orgId: ctx.orgId,
        titulo: titulo.trim(),
        descricao: descricao?.trim() ?? null,
        data,
        tipo: tipo ?? 'tarefa',
        horaInicio: horaInicio ?? null,
        horaFim: horaFim ?? null,
        responsavelId: responsavelId ?? null,
      })
      .returning();
    return NextResponse.json({ ...evento, fonte: 'agenda' }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
