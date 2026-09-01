import { db } from '@/db'
import { cobrancas, honorarios } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ── Tipos de eventos Asaas suportados ────────────────────────────────────────

type EventoAsaas =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_CANCELLED'

type StatusCobranca = 'received' | 'overdue' | 'refunded' | 'cancelled'

interface AsaasWebhookPayload {
  event: string
  payment?: {
    id: string
    externalReference?: string
    status?: string
  }
}

// ── Mapeamento de evento → status ─────────────────────────────────────────────

const EVENTO_PARA_STATUS: Record<EventoAsaas, StatusCobranca> = {
  PAYMENT_RECEIVED: 'received',
  PAYMENT_OVERDUE: 'overdue',
  PAYMENT_REFUNDED: 'refunded',
  PAYMENT_CANCELLED: 'cancelled',
}

const EVENTOS_SUPORTADOS = new Set<string>(Object.keys(EVENTO_PARA_STATUS))

// ── Recálculo de honorarios.statusPagamento ──────────────────────────────────

async function recalcularStatusHonorario(honorarioId: string): Promise<void> {
  const todasCobrancas = await db
    .select({ status: cobrancas.status })
    .from(cobrancas)
    .where(eq(cobrancas.honorarioId, honorarioId))

  if (todasCobrancas.length === 0) return

  const todasRecebidas = todasCobrancas.every((c: { status: string }) => c.status === 'received')
  const algumaRecebida = todasCobrancas.some((c: { status: string }) => c.status === 'received')

  let novoStatus: string
  if (todasRecebidas) {
    novoStatus = 'quitado'
  } else if (algumaRecebida) {
    novoStatus = 'parcial'
  } else {
    novoStatus = 'pendente'
  }

  await db
    .update(honorarios)
    .set({ statusPagamento: novoStatus })
    .where(eq(honorarios.id, honorarioId))
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validação do token de autenticidade
  const tokenRecebido = req.headers.get('asaas-access-token')
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN

  if (!tokenRecebido || tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ error: 'Token inválido ou ausente' }, { status: 401 })
  }

  // 2. Parsing do payload
  let payload: AsaasWebhookPayload
  try {
    payload = (await req.json()) as AsaasWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { event, payment } = payload

  // 3. Ignorar eventos não suportados — retornar 200 sem processar
  if (!EVENTOS_SUPORTADOS.has(event)) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // 4. Validar presença do externalReference
  const cobrancaId = payment?.externalReference
  if (!cobrancaId) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // 5. Localizar a cobrança pelo externalReference (= cobrancas.id)
  const [cobrancaExistente] = await db
    .select({
      id: cobrancas.id,
      status: cobrancas.status,
      honorarioId: cobrancas.honorarioId,
    })
    .from(cobrancas)
    .where(eq(cobrancas.id, cobrancaId))
    .limit(1)

  if (!cobrancaExistente) {
    // Cobrança não encontrada — evento descartado silenciosamente
    return NextResponse.json({ received: true, skipped: true })
  }

  const novoStatus = EVENTO_PARA_STATUS[event as EventoAsaas]

  // 6. Idempotência — não reprocessar se já no estado correto
  if (cobrancaExistente.status === novoStatus) {
    return NextResponse.json({ received: true, idempotent: true })
  }

  // 7. Atualizar status da cobrança
  await db
    .update(cobrancas)
    .set({ status: novoStatus, updatedAt: new Date() })
    .where(eq(cobrancas.id, cobrancaId))

  // 8. Recalcular status do honorário associado
  await recalcularStatusHonorario(cobrancaExistente.honorarioId)

  return NextResponse.json({ received: true })
}
