/**
 * Utilitários de validação de número de telefone.
 *
 * O formato exigido pela API Zenvia é E.164:
 *   +55 DD NNNNNNNNN  (DDI + DDD + número com 8 ou 9 dígitos)
 *   Exemplos válidos: +5511999999999, +5521987654321
 */

/**
 * Regex para número brasileiro E.164:
 *   - Começa com +55
 *   - Seguido de DDD (2 dígitos: 11–99)
 *   - Seguido de 8 ou 9 dígitos
 */
const REGEX_E164_BR = /^\+55\d{2}\d{8,9}$/;

/**
 * Valida se o número está no formato E.164 brasileiro.
 *
 * @param numero Número a validar, ex: "+5511999999999"
 * @returns `true` se o número for válido; `false` caso contrário.
 */
export function isNumeroE164Valido(numero: string): boolean {
  return REGEX_E164_BR.test(numero);
}

/**
 * Valida o número e lança um erro descritivo caso seja inválido.
 * Use antes de qualquer chamada à API Zenvia para garantir que
 * números mal formatados nunca chegam à API.
 *
 * @param numero Número a validar
 * @throws {Error} Se o número não estiver no formato E.164
 */
export function assertNumeroE164(numero: string): void {
  if (!isNumeroE164Valido(numero)) {
    throw new Error(
      `Número de telefone inválido: "${numero}". ` +
        'Esperado formato E.164 com DDI brasileiro: +55DDNNNNNNNNN ' +
        '(ex: +5511999999999).',
    );
  }
}
