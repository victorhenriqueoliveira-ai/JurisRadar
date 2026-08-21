/**
 * Validação de CPF com algoritmo de dígitos verificadores.
 *
 * Nunca exponha o CPF em logs ou respostas de erro — use apenas booleano.
 */

/**
 * Remove formatação do CPF (pontos e traço), retornando apenas dígitos.
 */
function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Valida um CPF usando o algoritmo oficial de dígitos verificadores.
 *
 * @param cpf - CPF com ou sem formatação (ex: "123.456.789-09" ou "12345678909")
 * @returns `true` se o CPF for válido, `false` caso contrário
 */
export function validateCpf(cpf: string): boolean {
  const digits = normalizeCpf(cpf)

  // Deve ter exatamente 11 dígitos
  if (digits.length !== 11) return false

  // CPF com todos os dígitos iguais é inválido (ex: "111.111.111-11")
  if (/^(\d)\1{10}$/.test(digits)) return false

  // Calcula primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[9], 10)) return false

  // Calcula segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[10], 10)) return false

  return true
}
