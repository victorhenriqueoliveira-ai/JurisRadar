/**
 * POST /api/clientes
 *
 * Cria ou atualiza (upsert) um cliente por (org_id, cpf_cnpj).
 * Conflito atualiza nome, email e whatsapp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { upsertCliente } from '@/services/comunicacao-cliente';

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const { nome, email, whatsapp, cpfCnpj } = body as Record<string, string>;

  if (!nome) {
    return NextResponse.json({ error: 'Campo obrigatório ausente: nome.' }, { status: 400 });
  }

  const { id } = await upsertCliente({
    orgId: ctx.orgId,
    nome,
    email,
    whatsapp,
    cpfCnpj,
  });

  return NextResponse.json({ id }, { status: 201 });
}
