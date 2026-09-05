/**
 * POST /api/comunicacoes/whatsapp-link
 *
 * Gera URL wa.me com mensagem pré-preenchida e registra a intenção
 * de comunicação via WhatsApp em comunicacoes_cliente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import { registrar, gerarWhatsAppLink, verificarProcessoOrg } from '@/services/comunicacao-cliente';

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

  const { clienteId, telefone, mensagem, processoId } = body as Record<string, string>;

  if (!clienteId || !telefone || !mensagem) {
    return NextResponse.json(
      { error: 'Campos obrigatórios ausentes: clienteId, telefone, mensagem.' },
      { status: 400 },
    );
  }

  if (processoId) {
    const pertence = await verificarProcessoOrg(processoId, ctx.orgId);
    if (!pertence) {
      return NextResponse.json({ error: 'Processo não encontrado neste escritório.' }, { status: 403 });
    }
  }

  let url: string;
  try {
    url = await gerarWhatsAppLink(telefone, mensagem);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Telefone inválido.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { id: comunicacaoId } = await registrar({
    orgId: ctx.orgId,
    clienteId,
    processoId,
    canal: 'whatsapp',
    mensagem,
    enviadoPor: ctx.userId,
  });

  return NextResponse.json({ url, comunicacaoId }, { status: 201 });
}
