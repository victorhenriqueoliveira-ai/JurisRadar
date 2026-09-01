/**
 * Route handler para relatório de inadimplentes Asaas.
 *
 * GET /api/asaas/inadimplentes — Retorna cobranças com status = 'overdue'
 *   e vencimento < today - dias_atraso dias do org_id da sessão.
 *   Aceita query param `dias_atraso` (default: 1).
 */

import { and, eq, lt, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { cobrancas } from '@/db/schema';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

// ── Schema de query params ────────────────────────────────────────────────────

const inadimplentesQuerySchema = z.object({
  dias_atraso: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 1))
    .pipe(
      z
        .number()
        .int('dias_atraso deve ser um inteiro')
        .min(1, 'dias_atraso deve ser pelo menos 1'),
    ),
});

// ── GET /api/asaas/inadimplentes ──────────────────────────────────────────────

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
    dias_atraso: searchParams.get('dias_atraso') ?? undefined,
  };

  const parsedQuery = inadimplentesQuerySchema.safeParse(queryRaw);
  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: 'Parâmetros de consulta inválidos.',
        detalhes: parsedQuery.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { dias_atraso: diasAtraso } = parsedQuery.data;

  // 3. Calcular data de corte: today - diasAtraso dias
  const dataCorte = new Date();
  dataCorte.setDate(dataCorte.getDate() - diasAtraso);
  const dataCorteStr = dataCorte.toISOString().split('T')[0]; // YYYY-MM-DD

  // 4. Buscar cobranças inadimplentes do org_id (isolamento de dados)
  const resultado = await db
    .select()
    .from(cobrancas)
    .where(
      and(
        eq(cobrancas.orgId, ctx.orgId),
        eq(cobrancas.status, 'overdue'),
        lt(cobrancas.vencimento, dataCorteStr),
      ),
    )
    .orderBy(cobrancas.vencimento);

  // 5. Mapear para o formato de resposta público
  const inadimplentes = resultado.map((c) => {
    const vencimentoDate = new Date(c.vencimento as string);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diffMs = hoje.getTime() - vencimentoDate.getTime();
    const diasAtrasoCalc = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    return {
      id: c.id,
      clienteNome: c.clienteNome,
      clienteEmail: c.clienteEmail,
      valor: Number(c.valor),
      vencimento: c.vencimento,
      diasAtraso: diasAtrasoCalc,
      linkBoleto: c.linkBoleto ?? null,
      linkPix: c.linkPix ?? null,
    };
  });

  return NextResponse.json(inadimplentes);
}
