/**
 * Testes de integração para GET /api/billing/portal
 *
 * A rota não usa mais o Customer Portal do Stripe (migração para Asaas
 * concluída na Fase 5) — hoje é um simples redirect, sem autenticação nem
 * consulta ao banco, para a tela interna de assinatura.
 */
import { describe, it, expect } from 'vitest'
import { GET } from '../portal/route'

describe('GET /api/billing/portal', () => {
  it('redireciona para /configuracoes/billing', async () => {
    const response = await GET()

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/configuracoes/billing')
  })
})
