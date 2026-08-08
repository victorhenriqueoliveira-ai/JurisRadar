import { z } from 'zod';

export const DataJudSearchSchema = z
  .object({
    keyword: z.string().min(2, 'Mínimo 2 caracteres').max(200).optional(),
    numeroProcesso: z.string().min(5).max(50).optional(),
    comarca: z.string().min(2).max(100).optional(),
    grau: z.enum(['G1', 'G2', 'JE']).optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial inválida')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final inválida')
      .optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .refine((d) => d.keyword || d.numeroProcesso, {
    message: 'Informe uma palavra-chave ou número do processo',
    path: ['keyword'],
  });

export type DataJudSearchInput = z.infer<typeof DataJudSearchSchema>;
