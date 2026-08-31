import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Chave hex de 64 chars (32 bytes) para testes
const TEST_KEY = 'a'.repeat(64);

beforeEach(() => {
  process.env.ASAAS_ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  delete process.env.ASAAS_ENCRYPTION_KEY;
});

// ── Testes de criptografia ────────────────────────────────────────────────────

describe('encrypt / decrypt — round-trip', () => {
  it('encrypt → decrypt retorna a string original', async () => {
    const { encrypt, decrypt } = await import('../crypto');
    const original = 'api_key_super_secreta_$sb1234567890';
    const cifrado = encrypt(original);
    const decifrado = decrypt(cifrado);
    expect(decifrado).toBe(original);
  });

  it('strings diferentes produzem ciphertexts diferentes', async () => {
    const { encrypt } = await import('../crypto');
    const c1 = encrypt('chave-a');
    const c2 = encrypt('chave-b');
    expect(c1).not.toBe(c2);
  });

  it('o mesmo plaintext produz ciphertexts diferentes (IV aleatório)', async () => {
    const { encrypt } = await import('../crypto');
    const plaintext = 'mesma-chave-repetida';
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    // Ciphertexts diferentes por IVs distintos
    expect(c1).not.toBe(c2);
    // Mas ambos descriptografam para o mesmo valor
    const { decrypt } = await import('../crypto');
    expect(decrypt(c1)).toBe(plaintext);
    expect(decrypt(c2)).toBe(plaintext);
  });

  it('o ciphertext tem 3 partes separadas por ":"', async () => {
    const { encrypt } = await import('../crypto');
    const cifrado = encrypt('qualquer texto');
    const partes = cifrado.split(':');
    expect(partes).toHaveLength(3);
  });
});

describe('decrypt — casos de erro', () => {
  it('lança erro para formato inválido (menos de 3 partes)', async () => {
    const { decrypt } = await import('../crypto');
    expect(() => decrypt('ivhex:authtaghex')).toThrow('Formato de ciphertext inválido');
  });

  it('lança erro de autenticação GCM quando a chave é diferente', async () => {
    const { encrypt } = await import('../crypto');
    const cifrado = encrypt('dado secreto');

    // Trocar a chave por uma diferente
    process.env.ASAAS_ENCRYPTION_KEY = 'b'.repeat(64);

    const { decrypt } = await import('../crypto');
    // Reimportar para pegar o novo env
    const { decrypt: decryptFresh } = await import('../crypto?v=fresh_' + Date.now());

    expect(() => decryptFresh(cifrado)).toThrow();
  });

  it('lança erro quando ASAAS_ENCRYPTION_KEY não está configurada', async () => {
    delete process.env.ASAAS_ENCRYPTION_KEY;
    // Limpar o módulo em cache para recarregar com env limpo
    const { decrypt } = await import('../crypto');
    expect(() => decrypt('iv:tag:ciphertext')).toThrow('ASAAS_ENCRYPTION_KEY não configurada');
  });

  it('lança erro quando ASAAS_ENCRYPTION_KEY tem tamanho errado', async () => {
    process.env.ASAAS_ENCRYPTION_KEY = 'curta-demais';
    const { encrypt } = await import('../crypto');
    expect(() => encrypt('qualquer')).toThrow('64 caracteres hex');
  });
});
