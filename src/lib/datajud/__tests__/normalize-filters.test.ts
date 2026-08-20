import { describe, it, expect } from 'vitest';
import { normalizeFilters } from '../normalize-filters';

describe('normalizeFilters', () => {
  it('arrays em ordens diferentes produzem o mesmo hash SHA-256', () => {
    const hash1 = normalizeFilters({ grau: ['G2', 'G1'] });
    const hash2 = normalizeFilters({ grau: ['G1', 'G2'] });
    expect(hash1).toBe(hash2);
  });

  it('filtros diferentes produzem hashes diferentes', () => {
    const hash1 = normalizeFilters({ grau: ['G1'] });
    const hash2 = normalizeFilters({ grau: ['G2'] });
    expect(hash1).not.toBe(hash2);
  });

  it('ordem das chaves do objeto não afeta o hash', () => {
    const hash1 = normalizeFilters({
      grau: ['G1'],
      dataDistribuicaoInicio: '2025-01-01',
    });
    const hash2 = normalizeFilters({
      dataDistribuicaoInicio: '2025-01-01',
      grau: ['G1'],
    });
    expect(hash1).toBe(hash2);
  });

  it('filtros vazios produzem hash consistente', () => {
    const hash1 = normalizeFilters({});
    const hash2 = normalizeFilters({});
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1).toHaveLength(64); // SHA-256 em hex
  });

  it('retorna string hexadecimal de 64 caracteres', () => {
    const hash = normalizeFilters({ assunto: ['pensão alimentícia'] });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('múltiplos assuntos em ordens diferentes produzem o mesmo hash', () => {
    const hash1 = normalizeFilters({ assunto: ['trabalhista', 'civil'] });
    const hash2 = normalizeFilters({ assunto: ['civil', 'trabalhista'] });
    expect(hash1).toBe(hash2);
  });
});
