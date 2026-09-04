/**
 * GET /api/processos/[id]/comunicacoes
 *
 * Retorna histórico paginado de comunicações do processo.
 * Verifica que o processo pertence ao org_id do usuário autenticado (403 caso contrário).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { listarPorProcesso, verificarProcessoOrg } from '@/services/comunicacao-cliente';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  const processoId = params.id;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  const pertence = await verificarProcessoOrg(processoId, ctx.orgId);
  if (!pertence) {
    return NextResponse.json({ error: 'Processo não encontrado neste escritório.' }, { status: 403 });
  }

  const comunicacoes = await listarPorProcesso(processoId, ctx.orgId, page, limit);

  return NextResponse.json({ comunicacoes, page, limit });
}
