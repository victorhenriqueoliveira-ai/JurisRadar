import { describe, it, expect } from 'vitest'
import { resolverEstiloEvento } from '../calendario-utils'

function dataFutura(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

describe('resolverEstiloEvento — cores base por tipo', () => {
  it('audiencia retorna backgroundColor azul', () => {
    const estilo = resolverEstiloEvento('audiencia', dataFutura(10))
    expect(estilo.style.backgroundColor).toBe('#2563eb')
  })

  it('intimacao retorna backgroundColor laranja', () => {
    const estilo = resolverEstiloEvento('intimacao', dataFutura(10))
    expect(estilo.style.backgroundColor).toBe('#ea580c')
  })

  it('prazo_fatal retorna backgroundColor vermelho sempre', () => {
    const estilo = resolverEstiloEvento('prazo_fatal', dataFutura(30))
    expect(estilo.style.backgroundColor).toBe('#dc2626')
  })

  it('tarefa retorna backgroundColor verde', () => {
    const estilo = resolverEstiloEvento('tarefa', dataFutura(10))
    expect(estilo.style.backgroundColor).toBe('#16a34a')
  })

  it('lembrete retorna backgroundColor amarelo', () => {
    const estilo = resolverEstiloEvento('lembrete', dataFutura(10))
    expect(estilo.style.backgroundColor).toBe('#ca8a04')
  })

  it('tipo desconhecido retorna cinza', () => {
    const estilo = resolverEstiloEvento('outro', dataFutura(10))
    expect(estilo.style.backgroundColor).toBe('#6b7280')
  })
})

describe('resolverEstiloEvento — intensidade por urgência', () => {
  it('audiencia com urgência ≤2 dias tem borderLeft', () => {
    const estilo = resolverEstiloEvento('audiencia', dataFutura(1))
    expect(estilo.style.borderLeft).toBeTruthy()
    expect(estilo.style.opacity).toBeUndefined()
  })

  it('audiencia com urgência de 5 dias não tem border nem opacity reduzida', () => {
    const estilo = resolverEstiloEvento('audiencia', dataFutura(5))
    expect(estilo.style.borderLeft).toBeUndefined()
    expect(estilo.style.opacity).toBeUndefined()
  })

  it('audiencia com urgência >7 dias tem opacity reduzida', () => {
    const estilo = resolverEstiloEvento('audiencia', dataFutura(10))
    expect(estilo.style.opacity).toBe(0.7)
    expect(estilo.style.borderLeft).toBeUndefined()
  })

  it('intimacao com urgência ≤2 dias tem borderLeft', () => {
    const estilo = resolverEstiloEvento('intimacao', dataFutura(0))
    expect(estilo.style.borderLeft).toBeTruthy()
  })

  it('intimacao com urgência >7 dias retorna backgroundColor laranja com opacity', () => {
    const estilo = resolverEstiloEvento('intimacao', dataFutura(8))
    expect(estilo.style.backgroundColor).toBe('#ea580c')
    expect(estilo.style.opacity).toBe(0.7)
  })

  it('prazo_fatal tem borderLeft independente de data', () => {
    const estilo = resolverEstiloEvento('prazo_fatal', dataFutura(100))
    expect(estilo.style.borderLeft).toBeTruthy()
  })

  it('retorna objeto com chave style', () => {
    const estilo = resolverEstiloEvento('tarefa', dataFutura(5))
    expect(estilo).toHaveProperty('style')
    expect(typeof estilo.style.backgroundColor).toBe('string')
  })
})
