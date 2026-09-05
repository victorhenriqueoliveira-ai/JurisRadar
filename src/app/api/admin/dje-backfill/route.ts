import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { djeEditions } from '@/db/schema';
import { inngest } from '@/inngest/client';

function lastWeekdays(n: number): string[] {
  const result: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (result.length < n) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) result.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() - 1);
  }
  return result;
}

async function alreadyIndexedDates(dates: string[]): Promise<Set<string>> {
  const rows = await db
    .select({ editionDate: djeEditions.editionDate })
    .from(djeEditions)
    .where(and(inArray(djeEditions.editionDate, dates), eq(djeEditions.status, 'completed')));

  const countByDate = new Map<string, number>();
  for (const row of rows) countByDate.set(row.editionDate, (countByDate.get(row.editionDate) ?? 0) + 1);

  const done = new Set<string>();
  for (const [date, count] of countByDate) if (count >= 2) done.add(date);
  return done;
}

// GET — informa o que está pendente
export async function GET(request: NextRequest) {
  const days = Math.min(60, parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10) || 30);
  const dates = lastWeekdays(days);
  const alreadyDone = await alreadyIndexedDates(dates);
  const pending = dates.filter((d) => !alreadyDone.has(d));

  return NextResponse.json({
    total: dates.length,
    alreadyIndexed: dates.length - pending.length,
    pending: pending.length,
    pendingDates: pending,
  });
}

// POST — dispara evento Inngest para processar datas pendentes
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { days?: number };
  const days = Math.min(60, body.days ?? 30);

  const dates = lastWeekdays(days);
  const alreadyDone = await alreadyIndexedDates(dates);
  const pending = dates.filter((d) => !alreadyDone.has(d)).sort();

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, message: 'Nada a indexar — todas as datas já estão completas.' });
  }

  await inngest.send({ name: 'dje/backfill.requested', data: { dates: pending } });

  return NextResponse.json({
    ok: true,
    message: `Evento disparado para ${pending.length} data(s). Acompanhe em http://localhost:8288`,
    dates: pending,
  });
}
