/**
 * POST /api/comunicacoes/email
 *
 * Envia e-mail ao cliente via Resend usando template NotificacaoCliente
 * e registra a comunicação em comunicacoes_cliente.
 *
 * Falha no Resend NÃO impede o registro — resiliência garantida pelo service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';
import {
  registrar,
  enviarEmailCliente,
  verificarProcessoOrg,
} from '@/services/comunicacao-cliente';

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

  const {
    clienteId,
    clienteEmail,
    processoId,
    processoNumCnj,
    tipoEvento,
    dataEvento,
    mensagemPersonalizada,
    nomeAdvogado,
  } = body as Record<string, string>;

  if (!clienteId || !clienteEmail || !processoNumCnj || !mensagemPersonalizada) {
    return NextResponse.json(
      { error: 'Campos obrigatórios ausentes: clienteId, clienteEmail, processoNumCnj, mensagemPersonalizada.' },
      { status: 400 },
    );
  }

  if (processoId) {
    const pertence = await verificarProcessoOrg(processoId, ctx.orgId);
    if (!pertence) {
      return NextResponse.json({ error: 'Processo não encontrado neste escritório.' }, { status: 403 });
    }
  }

  const { id: comunicacaoId } = await registrar({
    orgId: ctx.orgId,
    clienteId,
    processoId,
    canal: 'email',
    mensagem: mensagemPersonalizada,
    enviadoPor: ctx.userId,
  });

  const { enviado, erro } = await enviarEmailCliente({
    clienteEmail,
    clienteNome: body ? (body as Record<string, string>).clienteNome ?? '' : '',
    processoNumCnj,
    tipoEvento: tipoEvento ?? '',
    dataEvento: dataEvento ?? '',
    mensagemPersonalizada,
    nomeAdvogado: nomeAdvogado ?? '',
  });

  return NextResponse.json({ comunicacaoId, enviado, erro: erro ?? null }, { status: 201 });
}
