/**
 * POST /api/notificacoes/[id]/confirmar
 *
 * Confirma ciência de uma intimação, encerrando o protocolo de escalação.
 *
 * Executa em transação:
 *   1. Valida autenticação e pertencimento ao org_id da sessão
 *   2. Verifica se já confirmada (retorna 409 se sim)
 *   3. Atualiza notificacoes.confirmado_em = now()
 *   4. Atualiza notificacao_garantia.confirmado_em = now()
 *   5. Emite evento Inngest `garantia/intimacao.confirmada`
 *
 * Response: { ok: true, garantiaId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq, and, isNull } from 'drizzle-orm'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { db } from '@/db'
import { notificacoes, notificacaoGarantia } from '@/db/schema'
import { inngest } from '@/inngest/client'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireOrgContext()
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Buscar notificação e verificar pertencimento ao org_id
    const notificacao = await db
      .select({
        id: notificacoes.id,
        orgId: notificacoes.orgId,
        garantiaId: notificacoes.garantiaId,
        confirmadoEm: notificacoes.confirmadoEm,
      })
      .from(notificacoes)
      .where(and(eq(notificacoes.id, id), eq(notificacoes.orgId, ctx.orgId)))
      .limit(1)

    if (notificacao.length === 0) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })
    }

    const notif = notificacao[0]

    // Verificar se já foi confirmada (idempotência)
    if (notif.confirmadoEm !== null) {
      return NextResponse.json(
        { error: 'Notificação já confirmada', confirmadoEm: notif.confirmadoEm },
        { status: 409 },
      )
    }

    const agora = new Date()

    // Atualizar notificacoes.confirmado_em
    await db
      .update(notificacoes)
      .set({ confirmadoEm: agora })
      .where(and(eq(notificacoes.id, id), isNull(notificacoes.confirmadoEm)))

    // Atualizar notificacao_garantia.confirmado_em (se existir registro de garantia)
    let garantiaId: string | null = notif.garantiaId ?? null

    if (garantiaId) {
      await db
        .update(notificacaoGarantia)
        .set({ confirmadoEm: agora, step: 'confirmado' })
        .where(
          and(
            eq(notificacaoGarantia.id, garantiaId),
            isNull(notificacaoGarantia.confirmadoEm),
          ),
        )
    } else {
      // Buscar garantia pela notificacao_id se não houver garantia_id direto
      const garantia = await db
        .select({ id: notificacaoGarantia.id })
        .from(notificacaoGarantia)
        .where(eq(notificacaoGarantia.notificacaoId, id))
        .limit(1)

      if (garantia.length > 0) {
        garantiaId = garantia[0].id
        await db
          .update(notificacaoGarantia)
          .set({ confirmadoEm: agora, step: 'confirmado' })
          .where(
            and(
              eq(notificacaoGarantia.id, garantiaId),
              isNull(notificacaoGarantia.confirmadoEm),
            ),
          )
      }
    }

    // Emitir evento Inngest para cancelar a function em andamento
    if (garantiaId) {
      await inngest.send({
        name: 'garantia/intimacao.confirmada',
        data: { garantiaId },
      })
    }

    console.log(
      `[POST /confirmar] notificacao_id=${id} confirmada org_id=${ctx.orgId} garantia_id=${garantiaId ?? 'null'}`,
    )

    return NextResponse.json({ ok: true, garantiaId })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    console.error('[POST /api/notificacoes/[id]/confirmar] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
