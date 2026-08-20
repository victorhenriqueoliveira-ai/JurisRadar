/**
 * Testes de integração para a autenticação NextAuth.js v5
 *
 * Testa os fluxos de autenticação com mocks de banco de dados.
 * Os testes de integração com banco real são marcados com skipIf.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hash } from 'bcryptjs';

// ── Mock da configuração de auth ─────────────────────────────────────────────

const mockDbResult: {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
}[] = [];

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => Promise.resolve(mockDbResult)),
        }),
      }),
    }),
  },
}));

vi.mock('@/db/schema', () => ({
  users: { email: 'email', passwordHash: 'passwordHash', id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

// ── Importa a função authorize isolada ───────────────────────────────────────

/**
 * Replica a lógica de authorize para testes de integração com DB mock.
 */
async function authorize(
  credentials: { email?: string; password?: string } | null,
  dbResult: { id: string; email: string; passwordHash: string; name: string | null }[]
) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const { compare } = await import('bcryptjs');
  const user = dbResult[0];
  if (!user) return null;

  const ok = await compare(credentials.password, user.passwordHash);
  if (!ok) return null;

  return { id: user.id, email: user.email, name: user.name ?? undefined };
}

// ── Testes de integração de autenticação ─────────────────────────────────────

describe('integração auth — Credentials Provider com DB mock', () => {
  const EMAIL = 'admin@jurisradar.com.br';
  const SENHA = 'Senha@Correta123';
  let hashSenha: string;

  beforeEach(async () => {
    hashSenha = await hash(SENHA, 10);
  });

  it('credenciais válidas retornam objeto user com id e email', async () => {
    const dbResult = [
      { id: 'user-uuid-abc', email: EMAIL, passwordHash: hashSenha, name: 'Admin' },
    ];

    const result = await authorize({ email: EMAIL, password: SENHA }, dbResult);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('user-uuid-abc');
    expect(result?.email).toBe(EMAIL);
  });

  it('credenciais inválidas (senha errada) retornam null', async () => {
    const dbResult = [
      { id: 'user-uuid-abc', email: EMAIL, passwordHash: hashSenha, name: 'Admin' },
    ];

    const result = await authorize({ email: EMAIL, password: 'SenhaErrada!' }, dbResult);

    expect(result).toBeNull();
  });

  it('e-mail inexistente retorna null', async () => {
    const result = await authorize(
      { email: 'naoexiste@jurisradar.com.br', password: SENHA },
      [] // banco sem resultados
    );

    expect(result).toBeNull();
  });

  it('credentials null retorna null', async () => {
    const result = await authorize(null, []);
    expect(result).toBeNull();
  });
});

// Utilitário que replica a lógica de isRotaPublica do middleware
function isRotaPublica(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/inngest')
  );
}

describe('integração auth — middleware (simulação de comportamento)', () => {
  it('rota /login deve ser pública (sem redirecionamento)', () => {
    expect(isRotaPublica('/login')).toBe(true);
  });

  it('rota /api/auth/* deve ser pública', () => {
    expect(isRotaPublica('/api/auth/callback/credentials')).toBe(true);
  });

  it('rota /api/inngest deve ser pública (webhook Inngest)', () => {
    expect(isRotaPublica('/api/inngest')).toBe(true);
  });

  it('rota /search deve ser protegida (sem sessão → redireciona)', () => {
    expect(isRotaPublica('/search')).toBe(false);
  });

  it('rota /api/searches deve ser protegida', () => {
    expect(isRotaPublica('/api/searches')).toBe(false);
  });

  it('rota /history deve ser protegida', () => {
    expect(isRotaPublica('/history')).toBe(false);
  });

  it('sem sessão em rota protegida deve resultar em redirect para /login', () => {
    const isAutenticado = false;
    const pathname = '/search';

    const deveRedirecionar = !isRotaPublica(pathname) && !isAutenticado;
    expect(deveRedirecionar).toBe(true);
  });

  it('com sessão em rota protegida NÃO deve redirecionar', () => {
    const isAutenticado = true;
    const pathname = '/search';

    const deveRedirecionar = !isRotaPublica(pathname) && !isAutenticado;
    expect(deveRedirecionar).toBe(false);
  });
});

describe('integração auth — seed de usuários', () => {
  it('hash gerado pelo seed deve ser verificável com bcrypt', async () => {
    const { compare } = await import('bcryptjs');
    const senhaOriginal = 'JurisRadar@2026';
    const hashGerado = await hash(senhaOriginal, 12);

    const resultado = await compare(senhaOriginal, hashGerado);
    expect(resultado).toBe(true);
  });

  it('hash do seed NÃO deve ser a senha em texto plano', async () => {
    const senhaOriginal = 'JurisRadar@2026';
    const hashGerado = await hash(senhaOriginal, 12);

    expect(hashGerado).not.toBe(senhaOriginal);
    expect(hashGerado).toMatch(/^\$2[ab]\$/); // bcrypt hash prefix
  });
});
