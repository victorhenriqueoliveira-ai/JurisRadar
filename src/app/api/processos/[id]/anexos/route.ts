/**
 * POST /api/processos/[id]/anexos — Upload multipart de arquivo para Vercel Blob.
 * GET  /api/processos/[id]/anexos — Lista todos os anexos do processo.
 *
 * Isolamento multi-tenant: todos os acessos filtram por org_id da sessão.
 * Validações de MIME type, tamanho (10 MB) e quota (500 MB/org) são delegadas ao StorageClient.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireOrgContext } from '@/lib/org-context'
import { UnauthorizedError } from '@/lib/errors'
import { storageClient } from '@/lib/storage/blob'
import { StorageError } from '@/lib/storage/validation'
import { db } from '@/db'
import { anexos, processos } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ── POST — upload de arquivo ───────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext()
    const { id: processoId } = await params

    // Verifica se o processo pertence ao org_id da sessão
    const [processo] = await db
      .select({ id: processos.id })
      .from(processos)
      .where(and(eq(processos.id, processoId), eq(processos.orgId, ctx.orgId)))
      .limit(1)

    if (!processo) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 })
    }

    // Extrai o arquivo do FormData
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json(
        { error: 'Requisição deve ser multipart/form-data com campo "arquivo"' },
        { status: 400 },
      )
    }

    const arquivo = formData.get('arquivo')

    if (!arquivo || !(arquivo instanceof File)) {
      return NextResponse.json(
        { error: 'Campo "arquivo" ausente ou inválido' },
        { status: 400 },
      )
    }

    // Delega upload, validação de MIME, tamanho e quota ao StorageClient
    const resultado = await storageClient.upload({
      arquivo,
      orgId: ctx.orgId,
      processoId,
      uploadedBy: ctx.userId,
    })

    // Persiste o registro de anexo no banco
    const [novoAnexo] = await db
      .insert(anexos)
      .values({
        orgId: ctx.orgId,
        processoId,
        nome: arquivo.name,
        url: resultado.url,
        tamanho: resultado.tamanho,
        mimeType: resultado.mimeType,
        uploadedBy: ctx.userId,
      })
      .returning()

    return NextResponse.json(
      {
        id: novoAnexo.id,
        url: novoAnexo.url,
        nome: novoAnexo.nome,
        tamanho: novoAnexo.tamanho,
        mimeType: novoAnexo.mimeType,
        createdAt: novoAnexo.createdAt,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (error instanceof StorageError) {
      // FILE_TOO_LARGE → 413, QUOTA_EXCEEDED → 413, INVALID_MIME_TYPE → 415
      if (error.code === 'FILE_TOO_LARGE' || error.code === 'QUOTA_EXCEEDED') {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 413 })
      }
      if (error.code === 'INVALID_MIME_TYPE') {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 415 })
      }
    }

    console.error('[POST /api/processos/:id/anexos] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// ── GET — listagem de anexos ───────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOrgContext()
    const { id: processoId } = await params

    // Verifica se o processo pertence ao org_id da sessão
    const [processo] = await db
      .select({ id: processos.id })
      .from(processos)
      .where(and(eq(processos.id, processoId), eq(processos.orgId, ctx.orgId)))
      .limit(1)

    if (!processo) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 })
    }

    // Lista apenas os anexos deste processo e org
    const lista = await db
      .select({
        id: anexos.id,
        nome: anexos.nome,
        url: anexos.url,
        tamanho: anexos.tamanho,
        mimeType: anexos.mimeType,
        uploadedBy: anexos.uploadedBy,
        createdAt: anexos.createdAt,
      })
      .from(anexos)
      .where(and(eq(anexos.processoId, processoId), eq(anexos.orgId, ctx.orgId)))

    return NextResponse.json({ data: lista, total: lista.length })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    console.error('[GET /api/processos/:id/anexos] erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
