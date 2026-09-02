/**
 * Schemas Zod para validação dos endpoints da API Asaas.
 *
 * Usados pelos route handlers ANTES de chamar o AsaasClient,
 * garantindo validação de entrada e mensagens de erro descritivas.
 */

import { z } from 'zod';

// ── Schema de connect ─────────────────────────────────────────────────────────

export const conectarSubContaSchema = z.object({
  /** Razão social ou nome do escritório */
  name: z
    .string({ required_error: 'O nome do escritório é obrigatório' })
    .min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .email('E-mail inválido'),
  /** CPF ou CNPJ (apenas dígitos ou formatado) */
  cpfCnpj: z
    .string({ required_error: 'O CPF/CNPJ é obrigatório' })
    .min(11, 'CPF/CNPJ deve ter pelo menos 11 dígitos'),
  companyType: z
    .enum(['INDIVIDUAL', 'LIMITED', 'ASSOCIATION', 'ASSOCIATION_OTHER'])
    .optional(),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  site: z.string().url('URL inválida').optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  incomeValue: z.number().positive('Faturamento deve ser positivo').optional(),
});

export type ConectarSubContaInput = z.infer<typeof conectarSubContaSchema>;

// ── Schema de cobrança pontual ────────────────────────────────────────────────

export const criarCobrancaSchema = z.object({
  honorarioId: z
    .string({ required_error: 'O honorarioId é obrigatório' })
    .uuid('honorarioId deve ser um UUID válido'),
  valor: z
    .number({ required_error: 'O valor é obrigatório' })
    .positive('O valor deve ser positivo'),
  vencimento: z
    .string({ required_error: 'A data de vencimento é obrigatória' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Vencimento deve estar no formato YYYY-MM-DD'),
  tipo: z.enum(['BOLETO', 'PIX', 'BOLETO_PIX'], {
    required_error: 'O tipo de cobrança é obrigatório',
    invalid_type_error: "Tipo deve ser 'BOLETO', 'PIX' ou 'BOLETO_PIX'",
  }),
  clienteEmail: z
    .string({ required_error: 'O e-mail do cliente é obrigatório' })
    .email('E-mail do cliente inválido'),
  clienteNome: z
    .string({ required_error: 'O nome do cliente é obrigatório' })
    .min(2, 'O nome do cliente deve ter pelo menos 2 caracteres'),
  clienteCpfCnpj: z
    .string({ required_error: 'O CPF/CNPJ do cliente é obrigatório' })
    .min(11, 'CPF/CNPJ deve ter pelo menos 11 dígitos'),
  descricao: z
    .string({ required_error: 'A descrição é obrigatória' })
    .min(5, 'A descrição deve ter pelo menos 5 caracteres'),
});

export type CriarCobrancaBody = z.infer<typeof criarCobrancaSchema>;

// ── Schema de assinatura recorrente ──────────────────────────────────────────

export const criarAssinaturaSchema = z.object({
  honorarioId: z
    .string({ required_error: 'O honorarioId é obrigatório' })
    .uuid('honorarioId deve ser um UUID válido'),
  valor: z
    .number({ required_error: 'O valor por parcela é obrigatório' })
    .positive('O valor deve ser positivo'),
  ciclo: z.enum(
    ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'ANNUALLY'],
    {
      required_error: 'O ciclo de cobrança é obrigatório',
      invalid_type_error:
        "Ciclo deve ser 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY' ou 'ANNUALLY'",
    },
  ),
  dataInicio: z
    .string({ required_error: 'A data de início é obrigatória' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve estar no formato YYYY-MM-DD'),
  totalParcelas: z
    .number()
    .int('O número de parcelas deve ser inteiro')
    .positive('O número de parcelas deve ser positivo')
    .optional(),
  clienteEmail: z
    .string({ required_error: 'O e-mail do cliente é obrigatório' })
    .email('E-mail do cliente inválido'),
  clienteNome: z
    .string({ required_error: 'O nome do cliente é obrigatório' })
    .min(2, 'O nome do cliente deve ter pelo menos 2 caracteres'),
  clienteCpfCnpj: z
    .string({ required_error: 'O CPF/CNPJ do cliente é obrigatório' })
    .min(11, 'CPF/CNPJ deve ter pelo menos 11 dígitos'),
  descricao: z
    .string({ required_error: 'A descrição é obrigatória' })
    .min(5, 'A descrição deve ter pelo menos 5 caracteres'),
});

export type CriarAssinaturaBody = z.infer<typeof criarAssinaturaSchema>;

// ── Schema de filtros de listagem ────────────────────────────────────────────

export const listarCobrancasQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'CANCELLED'])
    .optional(),
  honorarioId: z.string().uuid('honorarioId deve ser um UUID válido').optional(),
});

export type ListarCobrancasQuery = z.infer<typeof listarCobrancasQuerySchema>;
