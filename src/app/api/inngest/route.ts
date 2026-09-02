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
import { djeProcessoMatcher } from '@/inngest/dje-processo-matcher';
import { djenNacionalScheduler } from '@/inngest/djen-nacional-scheduler';
import { djenNacionalWorker } from '@/inngest/djen-nacional-worker';
import { syncProcessosScheduler } from '@/inngest/sync-processos-scheduler';
import { syncProcessosWorker } from '@/inngest/sync-processos-worker';
import { notificacaoDispatcher } from '@/inngest/notificacao-dispatcher';
import { alertasPrazo } from '@/inngest/alertas-prazo';
import { garantiaIntimacaoEscalador } from '@/inngest/garantia-intimacao-escalador';
import { garantiaFallbackCron } from '@/inngest/garantia-fallback-cron';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    djeIndexer, djeProcessoMatcher,
    djenNacionalScheduler, djenNacionalWorker,
    syncProcessosScheduler, syncProcessosWorker,
    notificacaoDispatcher, alertasPrazo,
    garantiaIntimacaoEscalador, garantiaFallbackCron,
  ],
});
