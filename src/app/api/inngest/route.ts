/**
 * Inngest serve handler — Next.js App Router
 *
 * Registra as Inngest functions do JurisRadar e expõe os endpoints necessários
 * para que o Inngest Dev Server e o cloud possam descobrir e invocar as functions.
 *
 * Exporta GET, POST e PUT conforme requerido pelo SDK do Inngest para Next.js.
 */

import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { djeIndexer } from '@/inngest/dje-indexer';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [djeIndexer],
});
