/**
 * Testes unitários e de integração para src/lib/dje/parser.ts
 *
 * Cobre:
 * - segmentPublications: segmentação por número CNJ, instância, publicationDate, court
 * - extractCourt: identificação de vara/câmara em blocos TJSP
 * - extractTextFromPdf: validação de buffer inválido e extração real (integração)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { extractCourt, extractTextFromPdf, segmentPublications } from '../parser';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FIXTURES_DIR = join(__dirname, '../__fixtures__');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

/** Gera texto sintético com N publicações do caderno 3 */
function buildSyntheticText(count: number): string {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(7, '0');
    return `${n}-0${i % 9}.2026.8.26.0100\n${i + 1}ª Vara Cível Central da Capital\nConteúdo da publicação ${i + 1}. Intime-se.\n`;
  }).join('\n');
}

// ── segmentPublications ───────────────────────────────────────────────────────

describe('segmentPublications', () => {
  it('retorna array vazio para texto vazio', () => {
    expect(segmentPublications('', 3, '2026-08-07')).toEqual([]);
  });

  it('retorna array vazio para texto sem número CNJ', () => {
    const text = 'Texto sem nenhum processo judicial identificado aqui.';
    expect(segmentPublications(text, 3, '2026-08-07')).toEqual([]);
  });

  it('retorna array vazio para string apenas com espaços', () => {
    expect(segmentPublications('   \n   \t   ', 3, '2026-08-07')).toEqual([]);
  });

  it('com texto contendo 5 números CNJ retorna exatamente 5 publicações', () => {
    const text = buildSyntheticText(5);
    const result = segmentPublications(text, 3, '2026-08-07');
    expect(result).toHaveLength(5);
  });

  it('caderno 3 → todas as publicações têm instance: "1"', () => {
    const text = buildSyntheticText(3);
    const result = segmentPublications(text, 3, '2026-08-07');
    expect(result.every((p) => p.instance === '1')).toBe(true);
  });

  it('caderno 2 → todas as publicações têm instance: "2"', () => {
    const text = buildSyntheticText(3);
    const result = segmentPublications(text, 2, '2026-08-07');
    expect(result.every((p) => p.instance === '2')).toBe(true);
  });

  it('popula publicationDate com o valor passado como parâmetro', () => {
    const text = buildSyntheticText(2);
    const date = '2026-08-07';
    const result = segmentPublications(text, 3, date);
    expect(result.every((p) => p.publicationDate === date)).toBe(true);
  });

  it('popula caderno corretamente em cada publicação', () => {
    const text = buildSyntheticText(2);
    const result3 = segmentPublications(text, 3, '2026-08-07');
    const result2 = segmentPublications(text, 2, '2026-08-07');
    expect(result3.every((p) => p.caderno === 3)).toBe(true);
    expect(result2.every((p) => p.caderno === 2)).toBe(true);
  });

  it('popula processNumber com o número CNJ correto', () => {
    const text = '0001234-56.2026.8.26.0100\n1ª Vara Cível\nConteúdo.';
    const result = segmentPublications(text, 3, '2026-08-07');
    expect(result[0].processNumber).toBe('0001234-56.2026.8.26.0100');
  });

  it('segmenta corretamente texto com 3 CNJs — fixture caderno 3', () => {
    const text = loadFixture('sample-caderno3.txt');
    const result = segmentPublications(text, 3, '2026-08-07');
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.every((p) => p.instance === '1')).toBe(true);
  });

  it('segmenta corretamente texto com 3 CNJs — fixture caderno 2', () => {
    const text = loadFixture('sample-caderno2.txt');
    const result = segmentPublications(text, 2, '2026-08-07');
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.every((p) => p.instance === '2')).toBe(true);
  });

  it('cada publicação tem content não vazio', () => {
    const text = buildSyntheticText(5);
    const result = segmentPublications(text, 3, '2026-08-07');
    expect(result.every((p) => p.content.trim().length > 0)).toBe(true);
  });
});

// ── extractCourt ──────────────────────────────────────────────────────────────

describe('extractCourt', () => {
  it('identifica "15ª Vara Cível Central da Capital" (caderno 3)', () => {
    const block =
      '0000001-23.2026.8.26.0100\n15ª Vara Cível Central da Capital\nConteúdo da publicação.';
    expect(extractCourt(block)).toBe('15ª Vara Cível Central da Capital');
  });

  it('identifica "8ª Câmara de Direito Privado" (caderno 2)', () => {
    const block =
      '0000006-78.2026.8.26.0000\n8ª Câmara de Direito Privado\nAcórdão. Vistos.';
    expect(extractCourt(block)).toBe('8ª Câmara de Direito Privado');
  });

  it('identifica vara criminal', () => {
    const block =
      '0000003-45.2026.8.26.0100\n7ª Vara Criminal Central da Capital\nSentença.';
    expect(extractCourt(block)).toBe('7ª Vara Criminal Central da Capital');
  });

  it('identifica câmara de direito público', () => {
    const block =
      '0000007-89.2026.8.26.0000\n3ª Câmara de Direito Público\nAcórdão.';
    expect(extractCourt(block)).toBe('3ª Câmara de Direito Público');
  });

  it('identifica vara de família e sucessões', () => {
    const block =
      '0000002-34.2026.8.26.0100\n3ª Vara de Família e Sucessões Central da Capital\nConclusão.';
    expect(extractCourt(block)).toBeTruthy();
    expect(extractCourt(block)).toContain('Vara');
  });

  it('identifica câmara reservada de direito empresarial', () => {
    const block =
      '0000009-01.2026.8.26.0000\n1ª Câmara Reservada de Direito Empresarial\nDecisão.';
    expect(extractCourt(block)).toBeTruthy();
  });

  it('retorna null quando não há padrão de vara/câmara', () => {
    const block = '0000001-23.2026.8.26.0100\nConteúdo sem identificação de vara.';
    expect(extractCourt(block)).toBeNull();
  });

  it('retorna null para bloco vazio', () => {
    expect(extractCourt('')).toBeNull();
  });

  it('retorna null para bloco com apenas espaços', () => {
    expect(extractCourt('   \n   ')).toBeNull();
  });

  it('funciona corretamente com blocos das fixtures do caderno 3', () => {
    const text = loadFixture('sample-caderno3.txt');
    const publications = segmentPublications(text, 3, '2026-08-07');
    // Verifica que pelo menos 80% dos blocos com vara são identificados
    const withCourt = publications.filter((p) => p.court !== null);
    expect(withCourt.length).toBeGreaterThanOrEqual(Math.floor(publications.length * 0.8));
  });

  it('funciona corretamente com blocos das fixtures do caderno 2', () => {
    const text = loadFixture('sample-caderno2.txt');
    const publications = segmentPublications(text, 2, '2026-08-07');
    const withCourt = publications.filter((p) => p.court !== null);
    expect(withCourt.length).toBeGreaterThanOrEqual(Math.floor(publications.length * 0.8));
  });
});

// ── extractTextFromPdf ────────────────────────────────────────────────────────

describe('extractTextFromPdf', () => {
  it('lança erro descritivo para buffer vazio', async () => {
    const emptyBuffer = Buffer.alloc(0);
    await expect(extractTextFromPdf(emptyBuffer)).rejects.toThrow(
      /buffer inválido/i,
    );
  });

  it('lança erro para buffer sem magic bytes PDF', async () => {
    const invalidBuffer = Buffer.from('Este não é um PDF válido');
    await expect(extractTextFromPdf(invalidBuffer)).rejects.toThrow(
      /magic bytes/i,
    );
  });

  it('não retorna string vazia silenciosamente para buffer inválido', async () => {
    const invalidBuffer = Buffer.from('NOTAPDF');
    let threw = false;
    try {
      await extractTextFromPdf(invalidBuffer);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('lança erro com mensagem descritiva (não vazia) para PDF malformado', async () => {
    // Começa com %PDF mas é truncado/inválido
    const malformedPdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.from('conteudo invalido que nao e um pdf real'),
    ]);
    await expect(extractTextFromPdf(malformedPdf)).rejects.toThrow(Error);
  });
});
