import { z } from 'zod';

/**
 * Schema Zod para validação de parâmetros de busca DJE.
 *
 * Valida termo (mínimo 2 chars), datas no formato YYYY-MM-DD,
 * paginação e garante que dateTo >= dateFrom.
 */
export const DjeSearchSchema = z
  .object({
    term: z.string().min(2, 'Termo deve ter no mínimo 2 caracteres').max(200),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom deve estar no formato YYYY-MM-DD'),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo deve estar no formato YYYY-MM-DD'),
    name: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine((d) => new Date(d.dateTo) >= new Date(d.dateFrom), {
    message: 'dateTo deve ser maior ou igual a dateFrom',
    path: ['dateTo'],
  });

export type DjeSearchInput = z.infer<typeof DjeSearchSchema>;
