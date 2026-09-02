/**
 * Inngest function: garantiaFallbackCron
 *
 * Cron de segurança a cada 30 minutos que varre `notificacao_garantia`
 * em busca de intimações travadas no step `email_enviado` há mais de 4 horas
 * sem confirmação, e envia e-mail de lembrete para o responsável.
 *
 * SMS e WhatsApp desativados — somente e-mail.
 */

import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { notificacaoGarantia, users } from '@/db/schema';
import { sendEmail } from '@/lib/email/send';
import React from 'react';

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
          emailEnviadoEm: notificacaoGarantia.emailEnviadoEm,
          email: users.email,
          name: users.name,
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

    // Step 2: enviar e-mail de lembrete para cada garantia travada
    const resultados = await step.run('enviar-email-fallback', async () => {
      let enviados = 0;
      const erros: string[] = [];

      for (const garantia of garantiasTravadas) {
        try {
          const emailElement = React.createElement(
            'div',
            null,
            React.createElement('h2', null, '[JurisRadar] Lembrete: intimação crítica aguardando confirmação'),
            React.createElement(
              'p',
              null,
              'Você ainda não confirmou ciência de uma intimação crítica. Acesse o sistema para confirmar.',
            ),
          );

          await sendEmail({
            to: garantia.email,
            subject: '[JurisRadar] Lembrete: intimação crítica aguardando sua confirmação',
            react: emailElement,
          });

          enviados++;
          console.log(
            `[garantia-fallback-cron] E-mail de fallback enviado garantia_id=${garantia.garantiaId} org_id=${garantia.orgId} responsavel_id=${garantia.responsavelId}`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          erros.push(`garantia_id=${garantia.garantiaId}: ${msg}`);
          console.error(
            `[garantia-fallback-cron] Falha ao enviar e-mail fallback garantia_id=${garantia.garantiaId}:`,
            err,
          );
        }
      }

      return { enviados, erros, total: garantiasTravadas.length };
    });

    console.log('[garantia-fallback-cron] concluído', resultados);

    return resultados;
  },
);
