/**
 * Inngest function: notificacaoDispatcher
 *
 * Consome o evento `notificacao/nova` emitido pelo sync-processos-worker
 * quando uma movimentação relevante é detectada.
 *
 * Pipeline:
 *   1. Verificação de idempotência — evita notificação duplicada por movimentacao_id
 *   2. Persistência de notificação in-app na tabela `notificacoes`
 *   3. Envio de e-mail via Resend, respeitando preferências do usuário
 *
 * Tipos de evento que geram notificação:
 *   intimacao, citacao, decisao, sentenca, publicacao_dje
 *
 * Regras críticas:
 *   - NUNCA envia e-mail de forma síncrona — sempre via step.run
 *   - Idempotência garantida por movimentacao_id
 *   - Preferências do usuário são respeitadas (emailDesativado por tipo)
 */

import React from 'react';
import { and, eq } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { notificacoes, notificacaoGarantia, orgMembers } from '@/db/schema';
import { getNotificacaoPrefs, getUserEmail, isEmailDesativado } from '@/lib/notificacoes/preferencias';
import { sendEmail } from '@/lib/email/send';
import { NotificacaoIntimacao } from '@/lib/email/templates/NotificacaoIntimacao';

// ── Tipos de evento que geram notificação ─────────────────────────────────────

export { TIPOS_RELEVANTES, TIPOS_CRITICOS } from './tipos';
export type { TipoNotificacao } from './tipos';

// ── Payload do evento ─────────────────────────────────────────────────────────

export interface NotificacaoNovaPayload {
  movimentacaoId: string;
  orgId: string;
  userId: string;
  tipo: string;
  titulo: string;
  processoId: string;
  // Campos adicionais para templates específicos
  numeroCnj?: string;
  tribunal?: string;
  descricao?: string;
  prazo?: string;
  linkCrm?: string;
  processo?: string;
}

// ── Helpers de template ───────────────────────────────────────────────────────

/**
 * Seleciona o template React Email correto com base no tipo de notificação.
 * Tipos 'intimacao' e 'citacao' usam NotificacaoIntimacao.
 * Demais tipos usam um template base genérico.
 */
function buildEmailReactElement(
  tipo: string,
  payload: NotificacaoNovaPayload,
): React.ReactElement {
  if (tipo === 'intimacao' || tipo === 'citacao') {
    return React.createElement(NotificacaoIntimacao, {
      processo: payload.processo ?? payload.titulo,
      numeroCnj: payload.numeroCnj ?? payload.processoId,
      tribunal: payload.tribunal ?? 'Tribunal não informado',
      descricao: payload.descricao ?? payload.titulo,
      prazo: payload.prazo,
      linkCrm: payload.linkCrm ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://jurisradaroficial.com.br'}/processos/${payload.processoId}`,
    });
  }

  // Template genérico para tipos não específicos (decisao, sentenca, publicacao_dje)
  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, payload.titulo),
    React.createElement(
      'p',
      null,
      `Você tem uma nova notificação do tipo "${tipo}" em um dos seus processos monitorados.`,
    ),
    React.createElement(
      'p',
      null,
      'Acesse o JurisRadar para ver os detalhes.',
    ),
  );
}

// ── Inngest Function ──────────────────────────────────────────────────────────

export const notificacaoDispatcher = inngest.createFunction(
  {
    id: 'notificacao-dispatcher',
    name: 'Notificação Dispatcher',
    retries: 3,
    concurrency: {
      limit: 10,
    },
    triggers: [{ event: 'notificacao/nova' }],
  },
  async ({ event, step }) => {
    const payload = event.data as NotificacaoNovaPayload;
    const { movimentacaoId, orgId, userId, tipo, titulo, processoId } = payload;

    // Step 1: verificar idempotência — evitar notificação duplicada
    const existing = await step.run('check-idempotency', async () => {
      return db
        .select({ id: notificacoes.id })
        .from(notificacoes)
        .where(eq(notificacoes.movimentacaoId, movimentacaoId))
        .limit(1);
    });

    if (existing.length > 0) {
      console.log(
        `[notificacao-dispatcher] movimentacaoId=${movimentacaoId} já tem notificação — pulando`,
      );
      return { skipped: true, reason: 'already_exists' };
    }

    // Step 2: persistir notificação in-app
    const notificacaoId = await step.run('persist-notificacao', async () => {
      const inserted = await db
        .insert(notificacoes)
        .values({
          orgId,
          userId,
          processoId,
          tipo,
          titulo,
          movimentacaoId,
        })
        .returning({ id: notificacoes.id });

      return inserted[0].id;
    });

    console.log(
      `[notificacao-dispatcher] notificação in-app criada id=${notificacaoId} tipo=${tipo} userId=${userId}`,
    );

    // Step 3: verificar preferências e enviar e-mail (se não desativado)
    const emailResult = await step.run('send-email', async () => {
      const [prefs, userEmail] = await Promise.all([
        getNotificacaoPrefs(userId),
        getUserEmail(userId),
      ]);

      if (!userEmail) {
        console.warn(
          `[notificacao-dispatcher] usuário userId=${userId} não encontrado — e-mail não enviado`,
        );
        return { sent: false, reason: 'user_not_found' };
      }

      if (isEmailDesativado(prefs, tipo)) {
        console.log(
          `[notificacao-dispatcher] e-mail desativado para tipo=${tipo} userId=${userId} — pulando`,
        );
        return { sent: false, reason: 'email_disabled_for_type' };
      }

      const emailReactElement = buildEmailReactElement(tipo, payload);

      await sendEmail({
        to: userEmail,
        subject: titulo,
        react: emailReactElement,
      });

      return { sent: true, to: userEmail };
    });

    // Step 4: criar registro em notificacao_garantia (idempotente)
    const garantiaId = await step.run('criar-garantia', async () => {
      // Verificar idempotência — se já existe garantia para esta notificacao_id, retornar o id existente
      const existingGarantia = await db
        .select({ id: notificacaoGarantia.id })
        .from(notificacaoGarantia)
        .where(eq(notificacaoGarantia.notificacaoId, notificacaoId))
        .limit(1);

      if (existingGarantia.length > 0) {
        console.log(
          `[notificacao-dispatcher] garantia já existe para notificacaoId=${notificacaoId} — pulando criação`,
        );
        return existingGarantia[0].id;
      }

      // Buscar backup_id: membro com is_backup_contato = true no escritório
      const backupMember = await db
        .select({ userId: orgMembers.userId })
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.isBackupContato, true)))
        .limit(1);

      const backupId = backupMember.length > 0 ? backupMember[0].userId : null;

      const correlationId = `garantia-${notificacaoId}`;

      const inserted = await db
        .insert(notificacaoGarantia)
        .values({
          notificacaoId,
          orgId,
          responsavelId: userId,
          backupId,
          step: 'email_enviado',
          inngestCorrelationId: correlationId,
        })
        .returning({ id: notificacaoGarantia.id });

      console.log(
        `[notificacao-dispatcher] garantia criada id=${inserted[0].id} backupId=${backupId ?? 'nenhum'}`,
      );

      return inserted[0].id;
    });

    // Step 5: emitir evento de garantia apenas para tipos críticos
    const isCritico = (TIPOS_CRITICOS as readonly string[]).includes(tipo);

    if (isCritico) {
      await step.sendEvent('emitir-evento-garantia', {
        name: 'garantia/intimacao.iniciada',
        data: {
          garantiaId,
          orgId,
          responsavelId: userId,
          processoNumero: payload.numeroCnj ?? payload.processoId,
          link: payload.linkCrm ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://jurisradaroficial.com.br'}/processos/${processoId}`,
        },
      });

      console.log(
        `[notificacao-dispatcher] evento garantia/intimacao.iniciada emitido para tipo=${tipo} garantiaId=${garantiaId}`,
      );
    } else {
      console.log(
        `[notificacao-dispatcher] tipo=${tipo} não é crítico — evento de garantia não emitido`,
      );
    }

    return {
      skipped: false,
      notificacaoId,
      email: emailResult,
      garantiaId,
      garantiaEmitida: isCritico,
    };
  },
);
