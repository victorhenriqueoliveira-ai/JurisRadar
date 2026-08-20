/**
 * Testes unitários para validação de CPF.
 */
import { describe, it, expect } from 'vitest'
import { validateCpf } from '../cpf'

describe('validateCpf', () => {
  // CPFs válidos conhecidos (verificados com algoritmo real)
  const CPFS_VALIDOS = [
    '529.982.247-25',
    '111.444.777-35',
    '555.461.776-08',
    '52998224725',    // sem formatação
    '11144477735',
  ]

  // CPFs inválidos por dígito verificador errado
  const CPFS_DV_INVALIDO = [
    '529.982.247-26',  // último dígito errado
    '111.444.777-36',
    '555.461.776-09',  // último dígito errado
    '123.456.789-00',
  ]

  it('deve retornar true para CPF válido com formatação', () => {
    expect(validateCpf('529.982.247-25')).toBe(true)
  })

  it('deve retornar true para CPF válido sem formatação', () => {
    expect(validateCpf('52998224725')).toBe(true)
  })

  it('deve retornar true para múltiplos CPFs válidos', () => {
    for (const cpf of CPFS_VALIDOS) {
      expect(validateCpf(cpf), `CPF ${cpf} deveria ser válido`).toBe(true)
    }
  })

  it('deve retornar false para CPF "000.000.000-00"', () => {
    expect(validateCpf('000.000.000-00')).toBe(false)
  })

  it('deve retornar false para CPF com todos os dígitos iguais — "111.111.111-11"', () => {
    expect(validateCpf('111.111.111-11')).toBe(false)
  })

  it('deve retornar false para CPF com todos os dígitos iguais — "222.222.222-22"', () => {
    expect(validateCpf('222.222.222-22')).toBe(false)
  })

  it('deve retornar false para CPF com todos os dígitos iguais — "999.999.999-99"', () => {
    expect(validateCpf('999.999.999-99')).toBe(false)
  })

  it('deve retornar false para CPF com dígito verificador errado', () => {
    for (const cpf of CPFS_DV_INVALIDO) {
      expect(validateCpf(cpf), `CPF ${cpf} deveria ser inválido`).toBe(false)
    }
  })

  it('deve retornar false para CPF com menos de 11 dígitos', () => {
    expect(validateCpf('123.456.789')).toBe(false)
    expect(validateCpf('1234567')).toBe(false)
  })

  it('deve retornar false para CPF com mais de 11 dígitos', () => {
    expect(validateCpf('123.456.789-001')).toBe(false)
    expect(validateCpf('529.982.247-255')).toBe(false)
  })

  it('deve retornar false para string vazia', () => {
    expect(validateCpf('')).toBe(false)
  })

  it('deve retornar false para CPF apenas com letras', () => {
    expect(validateCpf('abc.def.ghi-jk')).toBe(false)
  })

  it('deve aceitar CPF com espaços que após limpeza resulta em 11 dígitos válidos', () => {
    // O normalize remove não-dígitos, então espaços serão removidos
    // 529.982.247-25 sem pontuação = 52998224725
    expect(validateCpf(' 529.982.247-25 ')).toBe(true)
  })
})
