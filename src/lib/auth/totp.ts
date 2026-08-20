/**
 * Utilitários TOTP para 2FA via Google Authenticator e apps compatíveis.
 *
 * Usa a biblioteca `otplib` (v13+) para geração e verificação de códigos TOTP.
 */
import { generateSecret as otplibGenerateSecret, generate, verify, generateURI } from 'otplib'
import QRCode from 'qrcode'

const APP_NAME = 'JurisRadar'

/**
 * Gera um novo secret TOTP aleatório (base32).
 */
export function generateSecret(): string {
  return otplibGenerateSecret()
}

/**
 * Retorna a URL otpauth:// usada para gerar o QR code.
 * O QR code pode ser escaneado com Google Authenticator.
 *
 * @param secret - Secret TOTP gerado por `generateSecret()`
 * @param email - E-mail do usuário (usado como label)
 */
export function getOtpauthUrl(secret: string, email: string): string {
  return generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
  })
}

/**
 * Gera a URL de dados (data URI) do QR code PNG para o secret TOTP.
 *
 * @param secret - Secret TOTP gerado por `generateSecret()`
 * @param email - E-mail do usuário
 * @returns Data URI da imagem QR code (base64 PNG)
 */
export async function getQrCodeUrl(secret: string, email: string): Promise<string> {
  const otpauthUrl = getOtpauthUrl(secret, email)
  return QRCode.toDataURL(otpauthUrl)
}

/**
 * Verifica se um código TOTP de 6 dígitos é válido para o secret informado.
 *
 * @param secret - Secret TOTP armazenado para o usuário
 * @param code - Código de 6 dígitos fornecido pelo usuário
 * @returns `true` se o código for válido e não expirado, `false` caso contrário
 */
export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  try {
    if (!secret || !code) return false
    const result = await verify({ token: code, secret })
    return result.valid
  } catch {
    return false
  }
}

/**
 * Gera o código TOTP atual para um secret.
 * Usado internamente e em testes.
 */
export async function generateTotpCode(secret: string): Promise<string> {
  return generate({ secret })
}
