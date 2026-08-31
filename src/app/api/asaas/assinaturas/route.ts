/**
 * Route handler para assinaturas recorrentes Asaas.
 *
 * POST /api/asaas/assinaturas — Cria assinatura recorrente (parcelamento) para um
 *   honorário. Valida que o honorário pertence ao org_id. Persiste em `cobrancas`
 *   com tipo 'recorrente' e retorna o asaasSubscriptionId.
 */

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cobrancas, honorarios } from '@/db/schema';
import { AsaasError } from '@/lib/asaas/errors';
import { asaasClient } from '@/lib/asaas/client';
import { criarAssinaturaSchema } from '@/lib/asaas/schemas';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

// ── POST /api/asaas/assinaturas ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  // 2. Validar body com Zod ANTES de qualquer operação
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido — JSON malformado.' }, { status: 400 });
  }

  const parsed = criarAssinaturaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Dados inválidos.',
        detalhes: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const {
    honorarioId,
    valor,
    ciclo,
    dataInicio,
    totalParcelas,
    clienteEmail,
    clienteNome,
    clienteCpfCnpj,
    descricao,
  } = parsed.data;

  // 3. Verificar que o honorário pertence ao org_id (isolamento de dados)
  const [honorario] = await db
    .select()
    .from(honorarios)
    .where(and(eq(honorarios.id, honorarioId), eq(honorarios.orgId, ctx.orgId)))
    .limit(1);

  if (!honorario) {
    return NextResponse.json(
      { error: 'Honorário não encontrado ou não pertence a este escritório.' },
      { status: 404 },
    );
  }

  // 4. Criar assinatura via AsaasClient
  try {
    const assinatura = await asaasClient.criarAssinatura({
      orgId: ctx.orgId,
      honorarioId,
      valor,
      ciclo,
      dataInicio,
      totalParcelas,
      clienteEmail,
      clienteNome,
      clienteCpfCnpj,
      descricao,
    });

    // 5. Persistir registro na tabela cobrancas como entrada recorrente
    const [cobrancaCriada] = await db
      .insert(cobrancas)
      .values({
        orgId: ctx.orgId,
        honorarioId,
        asaasSubscriptionId: assinatura.asaasSubscriptionId,
        tipo: 'recorrente',
        valor: String(valor),
        vencimento: dataInicio,
        status: 'pending',
        clienteEmail,
        clienteNome,
        clienteCpfCnpj,
        parcelaTotal: totalParcelas ? (totalParcelas as unknown as number & { __brand: 'smallint' }) : null,
      })
      .returning();

    // 6. Retornar response 201 com dados da assinatura
    return NextResponse.json(
      {
        id: cobrancaCriada.id,
        asaasSubscriptionId: assinatura.asaasSubscriptionId,
        status: assinatura.status,
        valor: assinatura.valor,
        ciclo: assinatura.ciclo,
        proximaCobranca: assinatura.proximaCobranca,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AsaasError) {
      return NextResponse.json(
        { error: `Erro Asaas: ${err.message}`, code: err.code },
        { status: 422 },
      );
    }
    console.error('[POST /api/asaas/assinaturas] Erro inesperado:', err);
    return NextResponse.json({ error: 'Erro interno ao criar assinatura.' }, { status: 500 });
  }
}
