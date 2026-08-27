import { describe, it, expect } from 'vitest';
import { isNumeroE164Valido, assertNumeroE164 } from '../phone';

describe('isNumeroE164Valido', () => {
  it('retorna true para número válido com 9 dígitos', () => {
    expect(isNumeroE164Valido('+5511999999999')).toBe(true);
  });

  it('retorna true para número válido com 8 dígitos (fixo)', () => {
    expect(isNumeroE164Valido('+551199999999')).toBe(true);
  });

  it('retorna true para DDD diferente', () => {
    expect(isNumeroE164Valido('+5521987654321')).toBe(true);
  });

  it('retorna false para número sem DDI +55', () => {
    expect(isNumeroE164Valido('11999999999')).toBe(false);
  });

  it('retorna false para número com DDI errado', () => {
    expect(isNumeroE164Valido('+1511999999999')).toBe(false);
  });

  it('retorna false para número sem + prefixo', () => {
    expect(isNumeroE164Valido('5511999999999')).toBe(false);
  });

  it('retorna false para número curto demais', () => {
    expect(isNumeroE164Valido('+55119999999')).toBe(false);
  });

  it('retorna false para número com letras', () => {
    expect(isNumeroE164Valido('+5511abcdefg')).toBe(false);
  });

  it('retorna false para string vazia', () => {
    expect(isNumeroE164Valido('')).toBe(false);
  });
});

describe('assertNumeroE164', () => {
  it('não lança erro para número válido', () => {
    expect(() => assertNumeroE164('+5511999999999')).not.toThrow();
  });

  it('lança erro com mensagem descritiva para número sem DDI', () => {
    expect(() => assertNumeroE164('11999999999')).toThrow(
      'Número de telefone inválido: "11999999999"',
    );
  });

  it('lança Error (não ZenviaError) para número inválido', () => {
    expect(() => assertNumeroE164('invalido')).toThrow(Error);
  });
});
