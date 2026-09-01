/**
 * Inngest function: garantiaFallbackCron
 *
 * Cron de segurança a cada 30 minutos que varre `notificacao_garantia`
 * em busca de intimações travadas no step `email_enviado` há mais de 4 horas
 * sem confirmação, e envia SMS diretamente via Zenvia.
 *
 * Propósito: cobrir cenários em que o `garantiaIntimacaoEscalador` não
 * acordou corretamente após o sleep (falha de infraestrutura, crash de worker).
 *
 * Critério de seleção:
 *   - step = 'email_enviado'
 *   - email_enviado_em < now() - 4h
 *   - confirmado_em IS NULL
 *
 * Ação: enviar SMS via ZenviaClient para o responsável.
 * Não altera step — a state machine principal permanece como autoridade.
 */

import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { notificacaoGarantia, users } from '@/db/schema';
import { enviarSMS } from '@/lib/zenvia/client';

// ── Inngest Function ──────────────────────────────────────────────────────────

export const garantiaFallbackCron = inngest.createFunction(
  {
    id: 'garantia-fallback-cron',
    name: 'Garantia de Intimação — Fallback Cron',
    retries: 2,
    triggers: [{ cron: '*/30 * * * *' }],
  },
  async ({ step }) => {
    // Step 1: buscar garantias travadas há mais de 4h sem confirmação
    const garantiasTravadas = await step.run('buscar-garantias-travadas', async () => {
      const quatroHorasAtras = sql`now() - interval '4 hours'`;

      return db
        .select({
          garantiaId: notificacaoGarantia.id,
          responsavelId: notificacaoGarantia.responsavelId,
          orgId: notificacaoGarantia.orgId,
          smsNumero: users.smsNumero,
          emailEnviadoEm: notificacaoGarantia.emailEnviadoEm,
        })
        .from(notificacaoGarantia)
        .innerJoin(users, eq(notificacaoGarantia.responsavelId, users.id))
        .where(
          and(
            eq(notificacaoGarantia.step, 'email_enviado'),
            lt(notificacaoGarantia.emailEnviadoEm, quatroHorasAtras),
            isNull(notificacaoGarantia.confirmadoEm),
          ),
        );
    });

    console.log(
      `[garantia-fallback-cron] garantias travadas encontradas: ${garantiasTravadas.length}`,
    );

    if (garantiasTravadas.length === 0) {
      return { total: 0, message: 'Nenhuma garantia travada para processar' };
    }

    // Step 2: enviar SMS de fallback para cada garantia
    const resultados = await step.run('enviar-sms-fallback', async () => {
      let enviados = 0;
      let pulados = 0;
      const erros: string[] = [];

      for (const garantia of garantiasTravadas) {
        if (!garantia.smsNumero) {
          console.log(
            `[garantia-fallback-cron] garantia_id=${garantia.garantiaId} sem sms_numero — pulado`,
          );
          pulados++;
          continue;
        }

        try {
          await enviarSMS({
            para: garantia.smsNumero,
            mensagem:
              '[JurisRadar] Atenção: você tem uma intimação crítica aguardando sua confirmação de ciência. Acesse o sistema para confirmar.',
            correlationId: `fallback-sms-${garantia.garantiaId}`,
          });

          enviados++;
          console.log(
            `[garantia-fallback-cron] SMS de fallback enviado garantia_id=${garantia.garantiaId} org_id=${garantia.orgId} responsavel_id=${garantia.responsavelId}`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          erros.push(`garantia_id=${garantia.garantiaId}: ${msg}`);
          console.error(
            `[garantia-fallback-cron] Falha ao enviar SMS fallback garantia_id=${garantia.garantiaId}:`,
            err,
          );
        }
      }

      return { enviados, pulados, erros, total: garantiasTravadas.length };
    });

    console.log('[garantia-fallback-cron] concluído', resultados);

    return resultados;
  },
);
