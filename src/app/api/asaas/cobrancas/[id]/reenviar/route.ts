/**
 * Route handler para reenvio de cobrança Asaas por e-mail.
 *
 * POST /api/asaas/cobrancas/[id]/reenviar — Envia e-mail ao cliente
 *   com link de pagamento (boleto/Pix) da cobrança especificada.
 *   Valida que a cobrança pertence ao org_id da sessão.
 *
 * NOTA: Para simplicidade no contexto do Hub Financeiro, o e-mail é enviado
 *   diretamente via sendEmail. Em produção com garantia de entrega, deve passar
 *   pelo Inngest (notificacao-dispatcher). Ver comentário em send.ts.
 */

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { db } from '@/db';
import { cobrancas } from '@/db/schema';
import { sendEmail } from '@/lib/email/send';
import { ReenvioCobranca } from '@/lib/email/templates/ReenvioCobranca';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

// ── POST /api/asaas/cobrancas/[id]/reenviar ──────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  // 1. Autenticação e contexto de organização
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  const { id: cobrancaId } = params;

  // 2. Buscar cobrança e validar pertencimento ao org_id (isolamento de dados)
  const [cobranca] = await db
    .select()
    .from(cobrancas)
    .where(and(eq(cobrancas.id, cobrancaId), eq(cobrancas.orgId, ctx.orgId)))
    .limit(1);

  if (!cobranca) {
    return NextResponse.json(
      { error: 'Cobrança não encontrada ou não pertence a este escritório.' },
      { status: 404 },
    );
  }

  // 3. Verificar que existe pelo menos um link de pagamento
  if (!cobranca.linkBoleto && !cobranca.linkPix) {
    return NextResponse.json(
      { error: 'Cobrança não possui link de boleto ou Pix para reenvio.' },
      { status: 422 },
    );
  }

  // 4. Montar descrição da cobrança
  const descricao = `Honorários — cobrança ${cobranca.id.slice(0, 8).toUpperCase()}`;

  // 5. Enviar e-mail ao cliente com o template ReenvioCobranca
  try {
    const result = await sendEmail({
      to: cobranca.clienteEmail,
      subject: `Lembrete de cobrança — vencimento em ${cobranca.vencimento ?? 'data não definida'}`,
      react: React.createElement(ReenvioCobranca, {
        clienteNome: cobranca.clienteNome,
        linkBoleto: cobranca.linkBoleto,
        linkPix: cobranca.linkPix,
        vencimento: cobranca.vencimento ?? 'data não definida',
        descricao,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        emailId: result.id,
        clienteEmail: cobranca.clienteEmail,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[POST /api/asaas/cobrancas/[id]/reenviar] Erro ao enviar e-mail:', err);
    return NextResponse.json(
      { error: 'Erro ao enviar e-mail de cobrança.' },
      { status: 500 },
    );
  }
}
