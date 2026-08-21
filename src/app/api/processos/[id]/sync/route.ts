/**
 * POST /api/processos/[id]/sync
 *
 * Busca movimentações do processo no DataJud e salva no banco.
 * Requer DATAJUD_API_KEY configurada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { getProcesso } from '@/services/processos';
import { queryTribunal } from '@/lib/datajud/client';
import { insertMovimentacoesIdempotente } from '@/lib/processos/upsert';
import { db } from '@/db';
import { movimentacoes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ESTADUAL_MAP: Record<string, string> = {
  '01': 'tjac', '02': 'tjal', '03': 'tjam', '04': 'tjap', '05': 'tjba',
  '06': 'tjce', '07': 'tjdft', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
  '11': 'tjmg', '12': 'tjms', '13': 'tjmt', '14': 'tjpa', '15': 'tjpb',
  '16': 'tjpe', '17': 'tjpi', '18': 'tjpr', '19': 'tjrj', '20': 'tjrn',
  '21': 'tjro', '22': 'tjrr', '23': 'tjrs', '24': 'tjsc', '25': 'tjse',
  '26': 'tjsp', '27': 'tjto',
};

const TRT_MAP: Record<string, string> = {
  '01': 'trt1', '02': 'trt2', '03': 'trt3', '04': 'trt4', '05': 'trt5',
  '06': 'trt6', '07': 'trt7', '08': 'trt8', '09': 'trt9', '10': 'trt10',
  '11': 'trt11', '12': 'trt12', '13': 'trt13', '14': 'trt14', '15': 'trt15',
  '16': 'trt16', '17': 'trt17', '18': 'trt18', '19': 'trt19', '20': 'trt20',
  '21': 'trt21', '22': 'trt22', '23': 'trt23', '24': 'trt24',
};

function cnj2TribunalIndex(numeroCnj: string): string | null {
  // Strip non-digits to get raw 20-digit CNJ
  const digits = numeroCnj.replace(/\D/g, '');
  if (digits.length !== 20) return null;
  const j = digits[13];
  const tt = digits.slice(14, 16);
  if (j === '8') return `api_publica_${ESTADUAL_MAP[tt] ?? ''}` || null;
  if (j === '5') return `api_publica_${TRT_MAP[tt] ?? ''}` || null;
  if (j === '7') {
    const n = parseInt(tt, 10);
    if (n >= 1 && n <= 5) return `api_publica_trf${n}`;
  }
  if (j === '1') return 'api_publica_stf';
  if (j === '3') return 'api_publica_stj';
  if (j === '4') return 'api_publica_tst';
  return null;
}

function tribunalToDataJudIndex(tribunal: string, numeroCnj?: string): string {
  // Try to extract from CNJ number first (most reliable)
  if (numeroCnj) {
    const fromCnj = cnj2TribunalIndex(numeroCnj);
    if (fromCnj) return fromCnj;
  }
  // Fallback: tribunal field should be a short code like "TJSP"
  const normalized = tribunal.trim().toUpperCase();
  if (/^[A-Z]{2,6}$/.test(normalized)) {
    return `api_publica_${normalized.toLowerCase()}`;
  }
  return `api_publica_${normalized.toLowerCase()}`;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext();
    const { id } = await params;

    const processo = await getProcesso(ctx, id);
    if (!processo) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 });
    }

    const tribunalIndex = tribunalToDataJudIndex(processo.tribunal ?? '', processo.numeroCnj);
    if (!tribunalIndex || tribunalIndex === 'api_publica_') {
      return NextResponse.json({ error: 'Não foi possível determinar o tribunal deste processo' }, { status: 400 });
    }

    let movs: { data: string; descricao: string; fonte: 'datajud' }[] = [];
    try {
      const { hits } = await queryTribunal(
        tribunalIndex,
        { numeroProcesso: processo.numeroCnj },
        0,
        1,
      );

      if (hits.length > 0 && hits[0].movimentos) {
        movs = hits[0].movimentos.map((m) => ({
          data: m.data,
          descricao: m.descricao,
          fonte: 'datajud' as const,
        }));
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'Erro ao consultar DataJud. Verifique DATAJUD_API_KEY.', detail: String(err) },
        { status: 502 },
      );
    }

    if (movs.length > 0) {
      await insertMovimentacoesIdempotente(
        movs.map((m) => ({
          processoId: id,
          orgId: ctx.orgId,
          data: m.data,
          descricao: m.descricao,
          fonte: 'datajud',
        })),
      );
    }

    const atualizadas = await db
      .select()
      .from(movimentacoes)
      .where(eq(movimentacoes.processoId, id))
      .orderBy(desc(movimentacoes.data))
      .limit(50);

    return NextResponse.json({ synced: movs.length, movimentacoes: atualizadas });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('[POST /api/processos/[id]/sync] erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
