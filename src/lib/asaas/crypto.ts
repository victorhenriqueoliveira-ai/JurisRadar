/**
 * Funções de criptografia AES-256-GCM para armazenamento seguro de API keys Asaas.
 *
 * Usa a API nativa `crypto` do Node.js (sem dependências externas).
 * A chave deve ser uma string hex de 64 caracteres (= 32 bytes = 256 bits).
 *
 * Formato do texto cifrado: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * - IV: 12 bytes (96 bits) — tamanho recomendado para GCM
 * - Auth tag: 16 bytes (128 bits) — tamanho padrão GCM
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // bytes — recomendado para GCM
const AUTH_TAG_LENGTH = 16; // bytes

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ASAAS_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'Variável de ambiente ASAAS_ENCRYPTION_KEY não configurada. ' +
        'Gere uma chave com: openssl rand -hex 32',
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `ASAAS_ENCRYPTION_KEY deve ter 64 caracteres hex (32 bytes). Recebido: ${keyHex.length} chars.`,
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Criptografa um texto simples com AES-256-GCM.
 *
 * @param plaintext Texto a ser criptografado (ex: API key da sub-conta Asaas)
 * @returns String no formato `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Descriptografa um texto cifrado com AES-256-GCM.
 *
 * @param ciphertext String no formato `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * @returns Texto original descriptografado
 * @throws {Error} Se o formato for inválido ou a autenticação GCM falhar
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error(
      `Formato de ciphertext inválido. Esperado "<iv>:<authTag>:<ciphertext>", recebido ${parts.length} partes.`,
    );
  }

  const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string];
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  // Se a chave ou os dados forem alterados, o GCM lançará um erro de autenticação
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted.toString('utf8');
}
