/**
 * Rate limiting simples por IP, baseado em contagem de tentativas no banco
 * (sem dependência de Redis/Upstash). Cada chamada registra uma tentativa e
 * verifica quantas tentativas o mesmo IP fez na janela de tempo configurada.
 */

import { db } from '@/db'
import { registroTentativas } from '@/db/schema'
import { and, eq, gte, count } from 'drizzle-orm'

const JANELA_MS = 60 * 60 * 1000 // 1 hora
const LIMITE_TENTATIVAS = 5

/**
 * Extrai o IP do cliente a partir dos headers padrão usados por proxies
 * (Vercel, Cloudflare etc). Retorna 'unknown' se nenhum header estiver presente.
 */
export function extrairIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}

/**
 * Registra uma tentativa para o IP informado e retorna se o limite foi
 * excedido (true = bloqueado). Sempre registra a tentativa, mesmo quando
 * bloqueada, para impedir que o cliente "ignore" o 429 e tente de novo sem custo.
 */
export async function checarRateLimitCadastro(ip: string): Promise<boolean> {
  await db.insert(registroTentativas).values({ ip })

  const desde = new Date(Date.now() - JANELA_MS)
  const [{ total }] = await db
    .select({ total: count() })
    .from(registroTentativas)
    .where(and(eq(registroTentativas.ip, ip), gte(registroTentativas.createdAt, desde)))

  return total > LIMITE_TENTATIVAS
}
