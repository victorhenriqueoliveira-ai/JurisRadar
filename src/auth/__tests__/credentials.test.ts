/**
 * Testes unitários para o Credentials Provider do NextAuth.js v5
 *
 * Testa a lógica de autenticação isolada do banco de dados (usando mocks).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compare, hash } from 'bcryptjs';

// ── Mock do módulo de banco de dados ─────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  users: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

// ── Helpers de teste ─────────────────────────────────────────────────────────

/**
 * Simula a função `authorize` do Credentials Provider.
 * Extrai a lógica de validação para testes isolados.
 */
async function authorize(
  credentials: { email: string; password: string } | null,
  queryResult: { id: string; email: string; passwordHash: string; name: string | null }[]
) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const user = queryResult[0];
  if (!user) {
    return null;
  }

  const senhaCorreta = await compare(credentials.password, user.passwordHash);
  if (!senhaCorreta) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
  };
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe('Credentials Provider — authorize', () => {
  const SENHA_TESTE = 'SenhaCorreta@123';
  let hashSenha: string;

  beforeEach(async () => {
    hashSenha = await hash(SENHA_TESTE, 10);
  });

  it('deve retornar objeto user com id e email quando e-mail e senha corretos', async () => {
    const usuario = {
      id: 'uuid-1234',
      email: 'usuario@exemplo.com',
      passwordHash: hashSenha,
      name: 'Usuário Teste',
    };

    const result = await authorize(
      { email: 'usuario@exemplo.com', password: SENHA_TESTE },
      [usuario]
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe('uuid-1234');
    expect(result?.email).toBe('usuario@exemplo.com');
    expect(result?.name).toBe('Usuário Teste');
  });

  it('deve retornar null quando senha incorreta (não deve lançar exceção)', async () => {
    const usuario = {
      id: 'uuid-1234',
      email: 'usuario@exemplo.com',
      passwordHash: hashSenha,
      name: 'Usuário Teste',
    };

    const result = await authorize(
      { email: 'usuario@exemplo.com', password: 'SenhaErrada@456' },
      [usuario]
    );

    expect(result).toBeNull();
  });

  it('deve retornar null quando e-mail não existe no banco', async () => {
    // queryResult vazio simula e-mail inexistente
    const result = await authorize(
      { email: 'inexistente@exemplo.com', password: SENHA_TESTE },
      []
    );

    expect(result).toBeNull();
  });

  it('deve retornar null quando credentials são null', async () => {
    const result = await authorize(null, []);
    expect(result).toBeNull();
  });

  it('deve retornar null quando e-mail está vazio', async () => {
    const result = await authorize({ email: '', password: SENHA_TESTE }, []);
    expect(result).toBeNull();
  });

  it('deve retornar null quando senha está vazia', async () => {
    const result = await authorize({ email: 'usuario@exemplo.com', password: '' }, []);
    expect(result).toBeNull();
  });

  it('deve mapear name null para undefined no retorno', async () => {
    const usuario = {
      id: 'uuid-5678',
      email: 'semname@exemplo.com',
      passwordHash: hashSenha,
      name: null,
    };

    const result = await authorize(
      { email: 'semname@exemplo.com', password: SENHA_TESTE },
      [usuario]
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBeUndefined();
  });
});

describe('bcryptjs — verificação de hash', () => {
  it('deve retornar true para senha correta', async () => {
    const senha = 'MinhaSenh@Segura';
    const hashGerado = await hash(senha, 10);
    const resultado = await compare(senha, hashGerado);
    expect(resultado).toBe(true);
  });

  it('deve retornar false para senha incorreta', async () => {
    const senha = 'MinhaSenh@Segura';
    const hashGerado = await hash(senha, 10);
    const resultado = await compare('SenhaErrada', hashGerado);
    expect(resultado).toBe(false);
  });

  it('deve gerar hashes diferentes para a mesma senha (salt aleatório)', async () => {
    const senha = 'MesmaSenha@123';
    const hash1 = await hash(senha, 10);
    const hash2 = await hash(senha, 10);
    expect(hash1).not.toBe(hash2);
  });

  it('deve ambos os hashes serem válidos para a mesma senha', async () => {
    const senha = 'MesmaSenha@123';
    const hash1 = await hash(senha, 10);
    const hash2 = await hash(senha, 10);
    expect(await compare(senha, hash1)).toBe(true);
    expect(await compare(senha, hash2)).toBe(true);
  });
});
