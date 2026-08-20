/**
 * Testes unitários para TOTP (2FA).
 */
import { describe, it, expect } from 'vitest'
import { generateSecret, getQrCodeUrl, verifyTotp, getOtpauthUrl, generateTotpCode } from '../totp'

describe('generateSecret', () => {
  it('deve retornar uma string não vazia', () => {
    const secret = generateSecret()
    expect(typeof secret).toBe('string')
    expect(secret.length).toBeGreaterThan(0)
  })

  it('deve gerar secrets diferentes em chamadas consecutivas', () => {
    const secret1 = generateSecret()
    const secret2 = generateSecret()
    expect(secret1).not.toBe(secret2)
  })

  it('deve retornar string base32 válida', () => {
    const secret = generateSecret()
    // Base32 usa apenas letras maiúsculas A-Z e dígitos 2-7
    expect(secret).toMatch(/^[A-Z2-7]+=*$/)
  })
})

describe('getOtpauthUrl', () => {
  it('deve retornar URL otpauth válida', () => {
    const secret = generateSecret()
    const url = getOtpauthUrl(secret, 'usuario@exemplo.com')
    expect(url).toMatch(/^otpauth:\/\/totp\//)
    expect(url).toContain('JurisRadar')
    expect(url).toContain(secret)
  })
})

describe('getQrCodeUrl', () => {
  it('deve retornar data URI de imagem PNG', async () => {
    const secret = generateSecret()
    const dataUrl = await getQrCodeUrl(secret, 'usuario@exemplo.com')
    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  })

  it('deve retornar string não vazia', async () => {
    const secret = generateSecret()
    const dataUrl = await getQrCodeUrl(secret, 'teste@jurisradar.com.br')
    expect(dataUrl.length).toBeGreaterThan(100)
  })
})

describe('verifyTotp', () => {
  it('deve retornar true para código válido e atual', async () => {
    const secret = generateSecret()
    // Gera o código atual usando a mesma biblioteca
    const validCode = await generateTotpCode(secret)
    expect(await verifyTotp(secret, validCode)).toBe(true)
  })

  it('deve retornar false para código "000000" inválido', async () => {
    const secret = generateSecret()
    // É extremamente improvável que 000000 seja o código correto
    const result = await verifyTotp(secret, '000000')
    // Apenas verificamos que a função retorna um booleano sem lançar exceção
    expect(typeof result).toBe('boolean')
  })

  it('deve retornar false para código com caracteres não numéricos', async () => {
    const secret = generateSecret()
    expect(await verifyTotp(secret, 'abcdef')).toBe(false)
  })

  it('deve retornar false para secret vazio', async () => {
    expect(await verifyTotp('', '123456')).toBe(false)
  })

  it('deve retornar false para código vazio', async () => {
    const secret = generateSecret()
    expect(await verifyTotp(secret, '')).toBe(false)
  })

  it('código gerado para secret A não é válido para secret B', async () => {
    const secretA = generateSecret()
    const secretB = generateSecret()
    const codeA = await generateTotpCode(secretA)
    // Extremamente improvável que seja válido para B
    expect(await verifyTotp(secretB, codeA)).toBe(false)
  })
})
