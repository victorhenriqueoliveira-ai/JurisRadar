import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import {
  searchPublications,
  createDjeSearch,
  listDjeSearches,
} from '@/db/dje';
import { DjeSearchSchema } from './schema';

export async function POST(request: NextRequest) {
  let userId: string;
  let orgId: string | undefined;
  try {
    const ctx = await requireOrgContext();
    userId = ctx.userId;
    orgId = ctx.orgId;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 422 });
  }

  let parsed: ReturnType<typeof DjeSearchSchema.parse>;
  try {
    parsed = DjeSearchSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: err.errors },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 422 });
  }

  const { term, dateFrom, dateTo, court, name, page, limit } = parsed;
  const params = { term, dateFrom, dateTo, court };

  const { results, total } = await searchPublications(params, page, limit, userId);
  const searchId = await createDjeSearch(userId, params, name, total, orgId);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json(
    { searchId, results, total, page, totalPages },
    { status: 201 },
  );
}

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    const ctx = await requireOrgContext();
    userId = ctx.userId;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20),
  );

  const { searches, total } = await listDjeSearches(userId, page, limit);

  return NextResponse.json({ searches, total }, { status: 200 });
}
