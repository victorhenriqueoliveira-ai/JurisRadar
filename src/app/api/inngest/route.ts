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
import { syncProcessosScheduler } from '@/inngest/sync-processos-scheduler';
import { syncProcessosWorker } from '@/inngest/sync-processos-worker';
import { notificacaoDispatcher } from '@/inngest/notificacao-dispatcher';
import { alertasPrazo } from '@/inngest/alertas-prazo';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [djeIndexer, syncProcessosScheduler, syncProcessosWorker, notificacaoDispatcher, alertasPrazo],
});
