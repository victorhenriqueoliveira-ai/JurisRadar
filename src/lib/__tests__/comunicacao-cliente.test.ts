import { describe, it, expect } from 'vitest'
import { buildWaLink } from '../comunicacao-cliente'

describe('buildWaLink', () => {
  it('formata telefone com DDI, DDD e número corretamente', () => {
    const url = buildWaLink('+55 (11) 99999-9999', 'Olá!')
    expect(url).toBe('https://wa.me/5511999999999?text=Ol%C3%A1!')
  })

  it('codifica espaços como %20', () => {
    const url = buildWaLink('11999999999', 'texto com espaços')
    expect(url).toContain('%20')
    expect(url).toBe('https://wa.me/11999999999?text=texto%20com%20espa%C3%A7os')
  })

  it('remove todos os caracteres não-numéricos', () => {
    const url = buildWaLink('+55 (11) 9.9999-9999', 'msg')
    expect(url).toContain('5511999999999')
    expect(url).not.toContain('+')
    expect(url).not.toContain('(')
    expect(url).not.toContain('-')
    expect(url).not.toContain(' ')
  })

  it('retorna URL começando com https://wa.me/', () => {
    const url = buildWaLink('11999999999', 'teste')
    expect(url).toMatch(/^https:\/\/wa\.me\/\d+\?text=/)
  })

  it('lança erro para telefone sem dígitos', () => {
    expect(() => buildWaLink('', 'mensagem')).toThrow('Telefone inválido')
    expect(() => buildWaLink('abc-xyz', 'mensagem')).toThrow('Telefone inválido')
  })

  it('aceita telefone somente com dígitos', () => {
    const url = buildWaLink('5511999999999', 'ok')
    expect(url).toBe('https://wa.me/5511999999999?text=ok')
  })

  it('codifica caracteres especiais na mensagem', () => {
    const url = buildWaLink('11999999999', 'Processo nº 0001234-56.2026.8.26.0001')
    expect(url).toContain('n%C2%BA')
  })
})
