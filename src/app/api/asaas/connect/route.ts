/**
 * Route handlers para conexão do escritório ao Asaas.
 *
 * POST /api/asaas/connect — Cria sub-conta Asaas para o escritório e persiste
 *   em `asaas_accounts` com status `pending`. Retorna 409 se já existir sub-conta.
 *
 * GET  /api/asaas/connect — Alias de status: retorna status atual da sub-conta.
 *   Equivalente semântico de GET /api/asaas/status.
 */

import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { asaasAccounts } from '@/db/schema';
import { AsaasError } from '@/lib/asaas/errors';
import { asaasClient } from '@/lib/asaas/client';
import { conectarSubContaSchema } from '@/lib/asaas/schemas';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

// ── POST /api/asaas/connect ────────────────────────────────────────────────────

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

  // 2. Verificar se o escritório já tem sub-conta (409 Conflict)
  const [existente] = await db
    .select()
    .from(asaasAccounts)
    .where(eq(asaasAccounts.orgId, ctx.orgId))
    .limit(1);

  if (existente) {
    return NextResponse.json(
      {
        error: 'Este escritório já possui uma sub-conta Asaas.',
        asaasAccountId: existente.asaasAccountId,
        status: existente.status,
      },
      { status: 409 },
    );
  }

  // 3. Validar body com Zod
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido — JSON malformado.' }, { status: 400 });
  }

  const parsed = conectarSubContaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Dados inválidos.',
        detalhes: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // 4. Criar sub-conta via AsaasClient (já persiste em asaas_accounts)
  try {
    const subconta = await asaasClient.criarSubConta({
      orgId: ctx.orgId,
      ...parsed.data,
    });

    return NextResponse.json(
      {
        asaasAccountId: subconta.asaasAccountId,
        status: subconta.status,
        onboardingUrl: subconta.onboardingUrl,
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
    console.error('[POST /api/asaas/connect] Erro inesperado:', err);
    return NextResponse.json({ error: 'Erro interno ao criar sub-conta.' }, { status: 500 });
  }
}

// ── GET /api/asaas/connect ─────────────────────────────────────────────────────

export async function GET() {
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

  // 2. Buscar sub-conta do escritório
  const [conta] = await db
    .select()
    .from(asaasAccounts)
    .where(eq(asaasAccounts.orgId, ctx.orgId))
    .limit(1);

  if (!conta) {
    return NextResponse.json(
      { status: null, message: 'Nenhuma sub-conta Asaas configurada para este escritório.' },
      { status: 200 },
    );
  }

  return NextResponse.json({
    asaasAccountId: conta.asaasAccountId,
    status: conta.status,
    onboardingUrl: conta.onboardingUrl,
    createdAt: conta.createdAt,
    activatedAt: conta.activatedAt,
  });
}
