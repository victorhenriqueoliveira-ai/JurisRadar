/**
 * DELETE /api/processos/[id]/anexos/[anexoId]
 *
 * Remove o anexo permanentemente:
 *   1. Verifica que o processo pertence ao org_id da sessão.
 *   2. Verifica que o anexo pertence ao processo e ao org_id.
 *   3. Remove o blob do Vercel Blob via StorageClient.delete().
 *   4. Deleta o registro da tabela `anexos`.
 *
 * A remoção do Blob é executada antes do banco para compensação automática:
 * se o delete do banco falhar, o blob já foi removido (sem órfãos no banco —
 * o registro permanece intacto para retry manual via admin).
 * Inversamente, se o del() no Blob falhar, o registro não é deletado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { storageClient } from '@/lib/storage/blob'
import { db } from '@/db'
import { anexos, processos } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string; anexoId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext()
    const { id: processoId, anexoId } = await params

    // Verifica se o processo pertence ao org_id da sessão
    const [processo] = await db
      .select({ id: processos.id })
      .from(processos)
      .where(and(eq(processos.id, processoId), eq(processos.orgId, ctx.orgId)))
      .limit(1)

    if (!processo) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 })
    }

    // Verifica se o anexo pertence ao processo E ao org_id (isolamento multi-tenant)
    const [anexo] = await db
      .select({ id: anexos.id, url: anexos.url })
      .from(anexos)
      .where(
        and(
          eq(anexos.id, anexoId),
          eq(anexos.processoId, processoId),
          eq(anexos.orgId, ctx.orgId),
        ),
      )
      .limit(1)

    if (!anexo) {
      return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
    }

    // Remove o blob do Vercel Blob (idempotente — falha silenciosa em URLs já removidas)
    await storageClient.delete(anexo.url)

    // Deleta o registro do banco
    await db
      .delete(anexos)
      .where(
        and(
          eq(anexos.id, anexoId),
          eq(anexos.processoId, processoId),
          eq(anexos.orgId, ctx.orgId),
        ),
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[DELETE /api/processos/:id/anexos/:anexoId] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
