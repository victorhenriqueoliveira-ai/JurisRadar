import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { searchDejesp, DEJESP_JUDICIAL_CUTOFF } from '@/lib/dje/client';

const DejespSearchSchema = z.object({
  term: z.string().min(2).max(200),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  court: z.string().min(2).max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export async function POST(request: NextRequest) {
  try {
    await requireOrgContext();
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

  let parsed: z.infer<typeof DejespSearchSchema>;
  try {
    parsed = DejespSearchSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: err.errors },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 422 });
  }

  const { term, dateFrom, dateTo, court, page, limit } = parsed;
  const skip = (page - 1) * limit;

  const result = await searchDejesp({ term, dateFrom, dateTo, court, skip, take: limit });

  const totalPages = Math.ceil(result.totalFromApi / limit);

  return NextResponse.json(
    {
      results: result.pages,
      total: result.total,
      totalFromApi: result.totalFromApi,
      page,
      totalPages,
      judicialCutoff: DEJESP_JUDICIAL_CUTOFF,
      truncatedToJudicialCutoff: result.truncatedToJudicialCutoff,
    },
    { status: 200 },
  );
}
