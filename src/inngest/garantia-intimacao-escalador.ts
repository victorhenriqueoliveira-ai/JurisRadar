/**
 * Inngest function: garantiaIntimacaoEscalador
 *
 * Orquestra o protocolo de escalação de intimações críticas:
 *   1. Dorme 2h aguardando confirmação do advogado
 *   2. Verifica se houve confirmação; se não, notifica o contato backup por e-mail
 *   3. Atualiza o step para 'backup_notificado'
 *
 * A function é cancelada atomicamente quando o advogado confirma ciência
 * via o evento `garantia/intimacao.confirmada`.
 *
 * SMS e WhatsApp desativados — somente e-mail e notificação in-app.
 */

import { eq } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { notificacaoGarantia, users } from '@/db/schema';
import { sendEmail } from '@/lib/email/send';
import React from 'react';

// ── Payload do evento ─────────────────────────────────────────────────────────

export interface GarantiaIntimacaoIniciada {
  garantiaId: string;
  orgId: string;
  responsavelId: string;
  processoNumero: string;
  link: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifica se a garantia de intimação já foi confirmada pelo responsável.
 */
export async function verificarConfirmacao(garantiaId: string): Promise<boolean> {
  const resultado = await db
    .select({ confirmadoEm: notificacaoGarantia.confirmadoEm })
    .from(notificacaoGarantia)
    .where(eq(notificacaoGarantia.id, garantiaId))
    .limit(1);

  if (resultado.length === 0) {
    console.warn(
      `[garantia-escalador] garantiaId=${garantiaId} não encontrado ao verificar confirmação`,
    );
    return false;
  }

  return resultado[0].confirmadoEm !== null;
}

/**
 * Notifica o contato backup via e-mail.
 * Atualiza step = 'backup_notificado' após envio.
 */
export async function notificarBackup(data: GarantiaIntimacaoIniciada): Promise<{
  backupNotificado: boolean;
  canal: string[];
}> {
  const garantiaResultado = await db
    .select({ backupId: notificacaoGarantia.backupId })
    .from(notificacaoGarantia)
    .where(eq(notificacaoGarantia.id, data.garantiaId))
    .limit(1);

  if (garantiaResultado.length === 0 || !garantiaResultado[0].backupId) {
    console.warn(
      `[garantia-escalador] garantiaId=${data.garantiaId} sem backup_id — backup pulado org_id=${data.orgId}`,
    );
    return { backupNotificado: false, canal: [] };
  }

  const backupId = garantiaResultado[0].backupId;

  const backupUser = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, backupId))
    .limit(1);

  if (backupUser.length === 0) {
    console.warn(
      `[garantia-escalador] backupId=${backupId} não encontrado — backup pulado garantia_id=${data.garantiaId}`,
    );
    return { backupNotificado: false, canal: [] };
  }

  const backup = backupUser[0];
  const canaisUtilizados: string[] = [];

  try {
    const emailElement = React.createElement(
      'div',
      null,
      React.createElement('h2', null, '[JurisRadar] Intimação crítica sem confirmação'),
      React.createElement(
        'p',
        null,
        `O advogado responsável ainda não confirmou ciência da intimação no processo ${data.processoNumero}.`,
      ),
      React.createElement(
        'p',
        null,
        `Por favor, entre em contato com o responsável ou acesse o sistema: ${data.link}`,
      ),
    );

    await sendEmail({
      to: backup.email,
      subject: `[JurisRadar] Backup: intimação crítica no processo ${data.processoNumero} sem confirmação`,
      react: emailElement,
    });

    canaisUtilizados.push('email');
    console.log(
      `[garantia-escalador] E-mail de backup enviado para backupId=${backupId} garantia_id=${data.garantiaId} org_id=${data.orgId}`,
    );
  } catch (err) {
    console.error(
      `[garantia-escalador] Falha ao enviar e-mail de backup backupId=${backupId} garantia_id=${data.garantiaId}:`,
      err,
    );
  }

  await db
    .update(notificacaoGarantia)
    .set({ step: 'backup_notificado', backupNotificadoEm: new Date() })
    .where(eq(notificacaoGarantia.id, data.garantiaId));

  console.log(
    `[garantia-escalador] Backup notificado via ${canaisUtilizados.join('+')} garantia_id=${data.garantiaId} org_id=${data.orgId}`,
  );

  return { backupNotificado: true, canal: canaisUtilizados };
}

// ── Inngest Function ──────────────────────────────────────────────────────────

export const garantiaIntimacaoEscalador = inngest.createFunction(
  {
    id: 'garantia-intimacao-escalador',
    name: 'Garantia de Intimação — Escalador',
    retries: 3,
    cancelOn: [{ event: 'garantia/intimacao.confirmada', match: 'data.garantiaId' }],
    triggers: [{ event: 'garantia/intimacao.iniciada' }],
  },
  async ({ event, step }) => {
    const data = event.data as GarantiaIntimacaoIniciada;
    const { garantiaId, orgId, processoNumero } = data;

    console.log(
      `[garantia-escalador] iniciando escalação garantia_id=${garantiaId} org_id=${orgId} processo=${processoNumero}`,
    );

    // Passo 1: aguardar 2h para que o responsável confirme ciência por e-mail
    await step.sleep('aguardar-2h', '2h');

    // Passo 2: verificar se já houve confirmação
    const confirmado = await step.run('verificar-confirmacao', () =>
      verificarConfirmacao(garantiaId),
    );

    if (confirmado) {
      console.log(
        `[garantia-escalador] confirmação recebida — encerrando garantia_id=${garantiaId} org_id=${orgId}`,
      );
      return { encerrado: 'confirmacao-recebida' };
    }

    // Passo 3: notificar contato backup por e-mail
    const resultadoBackup = await step.run('notificar-backup', () =>
      notificarBackup(data),
    );

    console.log(
      `[garantia-escalador] protocolo completo garantia_id=${garantiaId} org_id=${orgId}`,
      resultadoBackup,
    );

    return { encerrado: 'protocolo-completo', backup: resultadoBackup };
  },
);
