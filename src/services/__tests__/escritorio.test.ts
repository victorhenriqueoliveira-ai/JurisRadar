/**
 * Testes unitários para src/services/escritorio.ts — getOrganizacao.
 *
 * Nova função da Fase 3: fornece os dados cadastrais do escritório (nome,
 * CNPJ, área de atuação) para a tela de edição em /configuracoes/escritorio.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('@/db/schema', () => ({
  organizations: { id: 'id', name: 'name', cnpj: 'cnpj', areaAtuacao: 'area_atuacao' },
  orgMembers: { id: 'id', orgId: 'org_id', userId: 'user_id', role: 'role' },
  users: { id: 'id', name: 'name', email: 'email' },
  subscriptions: { orgId: 'org_id', status: 'status', plan: 'plan', currentPeriodEnd: 'current_period_end', trialEndsAt: 'trial_ends_at' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ type: 'eq', field, value })),
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
}))

import { db } from '@/db'
import { getOrganizacao } from '@/services/escritorio'

function makeCtx() {
  return { orgId: 'org-a', userId: 'user-1', role: 'socio' as const }
}

describe('getOrganizacao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna name, cnpj e areaAtuacao da organização do contexto', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ name: 'Escritório Teixeira', cnpj: '12.345.678/0001-90', areaAtuacao: 'Trabalhista' }]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const result = await getOrganizacao(makeCtx())

    expect(result).toEqual({ name: 'Escritório Teixeira', cnpj: '12.345.678/0001-90', areaAtuacao: 'Trabalhista' })
  })

  it('retorna null quando a organização não é encontrada', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>)

    const result = await getOrganizacao(makeCtx())

    expect(result).toBeNull()
  })
})
