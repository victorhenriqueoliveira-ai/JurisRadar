import { NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { listDistribuicaoTjspComarcas, listDistribuicaoTjspClasses } from '@/db/distribuicao-tjsp';

/** Comarcas e classes já indexadas — usado para popular os dropdowns de filtro da busca. */
export async function GET() {
  try {
    await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    throw err;
  }

  const [comarcas, classes] = await Promise.all([
    listDistribuicaoTjspComarcas(),
    listDistribuicaoTjspClasses(),
  ]);

  return NextResponse.json({ comarcas, classes }, { status: 200 });
}
