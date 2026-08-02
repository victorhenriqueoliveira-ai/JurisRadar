/**
 * Testes de integração para o schema do banco de dados.
 *
 * REQUER: DATABASE_URL configurada com conexão Neon real.
 * Executa somente quando a variável de ambiente está presente.
 *
 * Estes testes são pulados automaticamente em CI sem DATABASE_URL.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../schema';
import {
  users,
  searches,
  searchResults,
  searchCache,
} from '../schema';

const DATABASE_URL = process.env.DATABASE_URL;
const shouldRun = !!DATABASE_URL;

// IDs de teste para cleanup
let testUserId: string;
let testSearchId: string;

const getDb = () => {
  if (!DATABASE_URL) throw new Error('DATABASE_URL não definida');
  return drizzle(neon(DATABASE_URL), { schema });
};

describe.skipIf(!shouldRun)(
  'integração — CRUD básico nas 4 tabelas',
  () => {
    let db: ReturnType<typeof getDb>;

    beforeAll(() => {
      db = getDb();
    });

    afterAll(async () => {
      // Cleanup na ordem correta (respeitando FK constraints)
      if (testSearchId) {
        await db.delete(searchCache).where(eq(searchCache.searchId, testSearchId));
        await db.delete(searchResults).where(eq(searchResults.searchId, testSearchId));
        await db.delete(searches).where(eq(searches.id, testSearchId));
      }
      if (testUserId) {
        await db.delete(users).where(eq(users.id, testUserId));
      }
    });

    it('deve inserir e recuperar um usuário na tabela users', async () => {
      const [inserted] = await db
        .insert(users)
        .values({
          email: `test-${Date.now()}@jurisradar.test`,
          passwordHash: 'hash-teste-bcrypt',
          name: 'Usuário de Teste',
        })
        .returning();

      testUserId = inserted.id;

      expect(inserted.id).toBeTruthy();
      expect(inserted.email).toMatch(/@jurisradar\.test$/);
      expect(inserted.passwordHash).toBe('hash-teste-bcrypt');
      expect(inserted.name).toBe('Usuário de Teste');
      expect(inserted.createdAt).toBeInstanceOf(Date);
    });

    it('deve inserir e recuperar uma busca na tabela searches', async () => {
      const filters: schema.SearchFilters = {
        nomeParte: 'Empresa Teste',
        tribunais: ['TJSP', 'TJRJ'],
      };

      const [inserted] = await db
        .insert(searches)
        .values({
          userId: testUserId,
          name: 'Busca de Teste',
          filters,
          status: 'pending',
          totalTribunals: 2,
          processedTribunals: [],
          failedTribunals: [],
        })
        .returning();

      testSearchId = inserted.id;

      expect(inserted.id).toBeTruthy();
      expect(inserted.userId).toBe(testUserId);
      expect(inserted.status).toBe('pending');
      expect(inserted.totalTribunals).toBe(2);
      expect((inserted.filters as schema.SearchFilters).nomeParte).toBe('Empresa Teste');
    });

    it('deve inserir e recuperar resultados na tabela search_results', async () => {
      const partes: schema.Parte[] = [
        { polo: 'ativo', nome: 'Empresa Teste Ltda' },
      ];
      const ultimaMovimentacao: schema.UltimaMovimentacao = {
        data: '2024-01-15',
        descricao: 'Citação realizada',
      };

      const [inserted] = await db
        .insert(searchResults)
        .values({
          searchId: testSearchId,
          numero: '0001234-56.2024.8.26.0100',
          tribunal: 'TJSP',
          grau: '1',
          classe: 'Procedimento Comum',
          assunto: 'Responsabilidade Civil',
          orgaoJulgador: '1ª Vara Cível',
          partes,
          ultimaMovimentacao,
        })
        .returning();

      expect(inserted.id).toBeTruthy();
      expect(inserted.searchId).toBe(testSearchId);
      expect(inserted.tribunal).toBe('TJSP');
      expect((inserted.partes as schema.Parte[])[0].nome).toBe('Empresa Teste Ltda');
    });

    it('deve inserir e recuperar uma entrada na tabela search_cache', async () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

      const [inserted] = await db
        .insert(searchCache)
        .values({
          cacheKey: `test-cache-${Date.now()}`,
          searchId: testSearchId,
          expiresAt,
        })
        .returning();

      expect(inserted.cacheKey).toMatch(/^test-cache-/);
      expect(inserted.searchId).toBe(testSearchId);
      expect(inserted.expiresAt).toBeInstanceOf(Date);

      // Cleanup do cache
      await db.delete(searchCache).where(eq(searchCache.cacheKey, inserted.cacheKey));
    });
  },
);

describe.skipIf(!shouldRun)(
  'integração — constraints de FK e CASCADE',
  () => {
    let db: ReturnType<typeof getDb>;
    let localUserId: string;
    let localSearchId: string;

    beforeAll(async () => {
      db = getDb();

      // Cria usuário e busca locais para este grupo de testes
      const [u] = await db
        .insert(users)
        .values({
          email: `fk-test-${Date.now()}@jurisradar.test`,
          passwordHash: 'hash',
          name: 'FK Test User',
        })
        .returning();
      localUserId = u.id;

      const [s] = await db
        .insert(searches)
        .values({
          userId: localUserId,
          totalTribunals: 1,
          status: 'pending',
          processedTribunals: [],
          failedTribunals: [],
        })
        .returning();
      localSearchId = s.id;
    });

    afterAll(async () => {
      // Cascade cuida de search_results, mas precisamos limpar searches e users
      if (localSearchId) await db.delete(searches).where(eq(searches.id, localSearchId));
      if (localUserId) await db.delete(users).where(eq(users.id, localUserId));
    });

    it('deve rejeitar FK inválido em search_results (searchId inexistente)', async () => {
      await expect(
        db.insert(searchResults).values({
          searchId: '00000000-0000-0000-0000-000000000000', // UUID inexistente
          numero: '0000000-00.0000.0.00.0000',
          tribunal: 'TJXX',
          grau: '1',
        }),
      ).rejects.toThrow();
    });

    it('deve remover search_results ao deletar busca pai (ON DELETE CASCADE)', async () => {
      // Insere resultado vinculado à busca local
      const [result] = await db
        .insert(searchResults)
        .values({
          searchId: localSearchId,
          numero: '0001111-11.2024.8.26.0100',
          tribunal: 'TJSP',
          grau: '1',
        })
        .returning();

      expect(result.id).toBeTruthy();

      // Deleta a busca — deve cascadear para search_results
      await db.delete(searches).where(eq(searches.id, localSearchId));

      // Verifica que o resultado foi removido
      const remaining = await db
        .select()
        .from(searchResults)
        .where(eq(searchResults.id, result.id));

      expect(remaining).toHaveLength(0);

      // Recria a busca para o afterAll não falhar
      const [s] = await db
        .insert(searches)
        .values({
          userId: localUserId,
          totalTribunals: 1,
          status: 'pending',
          processedTribunals: [],
          failedTribunals: [],
        })
        .returning();
      localSearchId = s.id;
    });
  },
);
