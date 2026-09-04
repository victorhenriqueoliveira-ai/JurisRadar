import { NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const ctx = await requireOrgContext();
    const hoje = new Date().toISOString().slice(0, 10);

    const result = await db.execute(sql`
      SELECT * FROM v_eventos_calendario
      WHERE org_id = ${ctx.orgId}::uuid
        AND data = ${hoje}::date
      ORDER BY hora_inicio ASC NULLS LAST
    `);

    return NextResponse.json({ data: result.rows, date: hoje });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
