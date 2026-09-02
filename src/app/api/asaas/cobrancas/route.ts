/**
 * Route handlers para cobranças Asaas.
 *
 * POST /api/asaas/cobrancas — Cria cobrança pontual (boleto/Pix) para um honorário.
 *   Valida que o honorário pertence ao org_id (isolamento de dados).
 *   Persiste em `cobrancas` e retorna linkBoleto, linkPix e qrCodePix.
 *
 * GET  /api/asaas/cobrancas — Lista cobranças do escritório com filtros opcionais
 *   por `status` e `honorarioId`.
 */

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cobrancas, honorarios } from '@/db/schema';
import { AsaasError } from '@/lib/asaas/errors';
import { asaasClient } from '@/lib/asaas/client';
import { criarCobrancaSchema, listarCobrancasQuerySchema } from '@/lib/asaas/schemas';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

// ── POST /api/asaas/cobrancas ─────────────────────────────────────────────────

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

  const parsed = criarCobrancaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Dados inválidos.',
        detalhes: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { honorarioId, valor, vencimento, tipo, clienteEmail, clienteNome, clienteCpfCnpj, descricao } =
    parsed.data;

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

  // 4. Criar cobrança via AsaasClient
  try {
    const cobrancaAsaas = await asaasClient.criarCobranca({
      orgId: ctx.orgId,
      honorarioId,
      valor,
      vencimento,
      tipo,
      clienteEmail,
      clienteNome,
      clienteCpfCnpj,
      descricao,
    });

    // 5. Persistir resultado no banco
    const [cobrancaCriada] = await db
      .insert(cobrancas)
      .values({
        orgId: ctx.orgId,
        honorarioId,
        asaasPaymentId: cobrancaAsaas.asaasPaymentId,
        tipo: 'unica',
        valor: String(valor),
        vencimento: vencimento,
        status: 'pending',
        linkBoleto: cobrancaAsaas.linkBoleto ?? null,
        linkPix: cobrancaAsaas.linkPix ?? null,
        qrCodePix: cobrancaAsaas.qrCodePix ?? null,
        clienteEmail,
        clienteNome,
        clienteCpfCnpj,
      })
      .returning();

    // 6. Retornar response 201 com dados da cobrança
    return NextResponse.json(
      {
        id: cobrancaCriada.id,
        linkBoleto: cobrancaAsaas.linkBoleto,
        linkPix: cobrancaAsaas.linkPix,
        qrCodePix: cobrancaAsaas.qrCodePix,
        vencimento,
        status: 'pending',
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
    console.error('[POST /api/asaas/cobrancas] Erro inesperado:', err);
    return NextResponse.json({ error: 'Erro interno ao criar cobrança.' }, { status: 500 });
  }
}

// ── GET /api/asaas/cobrancas ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
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

  // 2. Validar query params com Zod
  const { searchParams } = new URL(req.url);
  const queryRaw = {
    status: searchParams.get('status') ?? undefined,
    honorarioId: searchParams.get('honorarioId') ?? undefined,
  };

  const parsedQuery = listarCobrancasQuerySchema.safeParse(queryRaw);
  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: 'Parâmetros de consulta inválidos.',
        detalhes: parsedQuery.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // 3. Construir filtros — sempre restrito ao org_id do contexto
  const { status: statusFiltro, honorarioId: honorarioIdFiltro } = parsedQuery.data;

  const whereConditions = [eq(cobrancas.orgId, ctx.orgId)];

  if (statusFiltro) {
    whereConditions.push(eq(cobrancas.status, statusFiltro.toLowerCase()));
  }

  if (honorarioIdFiltro) {
    whereConditions.push(eq(cobrancas.honorarioId, honorarioIdFiltro));
  }

  // 4. Buscar cobranças do banco (fonte de verdade)
  const resultado = await db
    .select()
    .from(cobrancas)
    .where(and(...whereConditions))
    .orderBy(cobrancas.createdAt);

  return NextResponse.json({ cobrancas: resultado });
}
