/**
 * GET /api/notificacoes/[id]/garantia
 *
 * Retorna o estado atual da garantia de intimação para uma notificação.
 *
 * Response: {
 *   step: string,
 *   emailEnviadoEm: string | null,
 *   smsEnviadoEm: string | null,
 *   whatsappEnviadoEm: string | null,
 *   backupNotificadoEm: string | null,
 *   confirmadoEm: string | null,
 * }
 *
 * Retorna 404 se a notificação não existir ou pertencer a outro org_id.
 * Retorna 204 (sem garantia) se a notificação não tiver registro de garantia.
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { db } from '@/db'
import { notificacoes, notificacaoGarantia } from '@/db/schema'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireOrgContext()
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Verificar que a notificação pertence ao org_id da sessão
    const notificacao = await db
      .select({ id: notificacoes.id, garantiaId: notificacoes.garantiaId })
      .from(notificacoes)
      .where(and(eq(notificacoes.id, id), eq(notificacoes.orgId, ctx.orgId)))
      .limit(1)

    if (notificacao.length === 0) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })
    }

    // Buscar o registro de garantia (por garantia_id ou por notificacao_id)
    const garantiaQuery = notificacao[0].garantiaId
      ? db
          .select({
            step: notificacaoGarantia.step,
            emailEnviadoEm: notificacaoGarantia.emailEnviadoEm,
            smsEnviadoEm: notificacaoGarantia.smsEnviadoEm,
            whatsappEnviadoEm: notificacaoGarantia.whatsappEnviadoEm,
            backupNotificadoEm: notificacaoGarantia.backupNotificadoEm,
            confirmadoEm: notificacaoGarantia.confirmadoEm,
          })
          .from(notificacaoGarantia)
          .where(eq(notificacaoGarantia.id, notificacao[0].garantiaId!))
          .limit(1)
      : db
          .select({
            step: notificacaoGarantia.step,
            emailEnviadoEm: notificacaoGarantia.emailEnviadoEm,
            smsEnviadoEm: notificacaoGarantia.smsEnviadoEm,
            whatsappEnviadoEm: notificacaoGarantia.whatsappEnviadoEm,
            backupNotificadoEm: notificacaoGarantia.backupNotificadoEm,
            confirmadoEm: notificacaoGarantia.confirmadoEm,
          })
          .from(notificacaoGarantia)
          .where(eq(notificacaoGarantia.notificacaoId, id))
          .limit(1)

    const garantia = await garantiaQuery

    if (garantia.length === 0) {
      // Notificação existe mas sem protocolo de garantia
      return new NextResponse(null, { status: 204 })
    }

    const g = garantia[0]

    return NextResponse.json({
      step: g.step,
      emailEnviadoEm: g.emailEnviadoEm?.toISOString() ?? null,
      smsEnviadoEm: g.smsEnviadoEm?.toISOString() ?? null,
      whatsappEnviadoEm: g.whatsappEnviadoEm?.toISOString() ?? null,
      backupNotificadoEm: g.backupNotificadoEm?.toISOString() ?? null,
      confirmadoEm: g.confirmadoEm?.toISOString() ?? null,
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/notificacoes/[id]/garantia] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
