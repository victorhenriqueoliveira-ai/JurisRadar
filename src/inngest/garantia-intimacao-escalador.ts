/**
 * Inngest function: garantiaIntimacaoEscalador
 *
 * Orquestra o protocolo de escalação de intimações críticas:
 *   1. Dorme 2h aguardando confirmação do advogado
 *   2. Verifica se houve confirmação; se não, envia SMS + WhatsApp via Zenvia
 *   3. Dorme mais 2h aguardando confirmação
 *   4. Verifica novamente; se ainda não confirmado, notifica o contato backup
 *
 * A function é cancelada atomicamente quando o advogado confirma ciência
 * via o evento `garantia/intimacao.confirmada`.
 *
 * Regras críticas:
 *   - NUNCA enviar SMS/WhatsApp se confirmado_em já estiver preenchido
 *   - Atualizar step e timestamps APÓS cada envio (idempotência Inngest)
 *   - WhatsApp é pulado se responsável não tiver whatsapp_numero cadastrado
 *   - Backup é pulado se não houver backup_id no registro de garantia
 */

import { eq, isNotNull } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { notificacaoGarantia, users } from '@/db/schema';
import { enviarSMS, enviarWhatsApp } from '@/lib/zenvia/client';
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
 * Retorna true se `confirmado_em` não for null.
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
 * Busca os dados do responsável pela garantia (sms_numero, whatsapp_numero).
 */
async function buscarResponsavelGarantia(garantiaId: string): Promise<{
  responsavelId: string;
  smsNumero: string | null;
  whatsappNumero: string | null;
  backupId: string | null;
} | null> {
  const resultado = await db
    .select({
      responsavelId: notificacaoGarantia.responsavelId,
      backupId: notificacaoGarantia.backupId,
      smsNumero: users.smsNumero,
      whatsappNumero: users.whatsappNumero,
    })
    .from(notificacaoGarantia)
    .innerJoin(users, eq(notificacaoGarantia.responsavelId, users.id))
    .where(eq(notificacaoGarantia.id, garantiaId))
    .limit(1);

  if (resultado.length === 0) return null;
  return resultado[0];
}

/**
 * Envia SMS e WhatsApp para o responsável pela intimação.
 * Atualiza step = 'sms_whatsapp_enviado' e timestamps após envio.
 */
export async function enviarCanalSecundario(data: GarantiaIntimacaoIniciada): Promise<{
  smsEnviado: boolean;
  whatsappEnviado: boolean;
}> {
  const responsavel = await buscarResponsavelGarantia(data.garantiaId);

  if (!responsavel) {
    console.warn(
      `[garantia-escalador] garantiaId=${data.garantiaId} responsável não encontrado — canal secundário pulado`,
    );
    return { smsEnviado: false, whatsappEnviado: false };
  }

  const correlationId = `garantia-sms-${data.garantiaId}`;
  let smsEnviado = false;
  let whatsappEnviado = false;

  // Enviar SMS se tiver número cadastrado
  if (responsavel.smsNumero) {
    try {
      await enviarSMS({
        para: responsavel.smsNumero,
        mensagem: `[JurisRadar] Você tem uma intimação crítica no processo ${data.processoNumero} aguardando ciência. Acesse: ${data.link}`,
        correlationId,
      });
      smsEnviado = true;
      console.log(
        `[garantia-escalador] SMS enviado para responsavelId=${responsavel.responsavelId} garantia_id=${data.garantiaId} org_id=${data.orgId}`,
      );
    } catch (err) {
      console.error(
        `[garantia-escalador] Falha ao enviar SMS para responsavelId=${responsavel.responsavelId} garantia_id=${data.garantiaId}:`,
        err,
      );
    }
  } else {
    console.log(
      `[garantia-escalador] responsavelId=${responsavel.responsavelId} sem sms_numero — SMS pulado garantia_id=${data.garantiaId}`,
    );
  }

  // Enviar WhatsApp se tiver número cadastrado
  if (responsavel.whatsappNumero) {
    try {
      await enviarWhatsApp({
        para: responsavel.whatsappNumero,
        processoNumero: data.processoNumero,
        link: data.link,
        correlationId: `garantia-wpp-${data.garantiaId}`,
      });
      whatsappEnviado = true;
      console.log(
        `[garantia-escalador] WhatsApp enviado para responsavelId=${responsavel.responsavelId} garantia_id=${data.garantiaId} org_id=${data.orgId}`,
      );
    } catch (err) {
      console.error(
        `[garantia-escalador] Falha ao enviar WhatsApp para responsavelId=${responsavel.responsavelId} garantia_id=${data.garantiaId}:`,
        err,
      );
    }
  } else {
    console.log(
      `[garantia-escalador] responsavelId=${responsavel.responsavelId} sem whatsapp_numero — WhatsApp pulado garantia_id=${data.garantiaId}`,
    );
  }

  // Atualizar step e timestamps no banco
  const agora = new Date();
  await db
    .update(notificacaoGarantia)
    .set({
      step: 'sms_whatsapp_enviado',
      ...(smsEnviado ? { smsEnviadoEm: agora } : {}),
      ...(whatsappEnviado ? { whatsappEnviadoEm: agora } : {}),
    })
    .where(eq(notificacaoGarantia.id, data.garantiaId));

  return { smsEnviado, whatsappEnviado };
}

/**
 * Notifica o contato backup via e-mail + WhatsApp.
 * Atualiza step = 'backup_notificado' e timestamp após envio.
 */
export async function notificarBackup(data: GarantiaIntimacaoIniciada): Promise<{
  backupNotificado: boolean;
  canal: string[];
}> {
  // Buscar dados do backup via notificacao_garantia
  const garantiaResultado = await db
    .select({
      backupId: notificacaoGarantia.backupId,
    })
    .from(notificacaoGarantia)
    .where(eq(notificacaoGarantia.id, data.garantiaId))
    .limit(1);

  if (garantiaResultado.length === 0 || !garantiaResultado[0].backupId) {
    console.warn(
      `[garantia-escalador] garantiaId=${data.garantiaId} sem backup_id configurado — backup pulado org_id=${data.orgId}`,
    );
    return { backupNotificado: false, canal: [] };
  }

  const backupId = garantiaResultado[0].backupId;

  // Buscar dados do usuário backup
  const backupUser = await db
    .select({
      email: users.email,
      whatsappNumero: users.whatsappNumero,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, backupId))
    .limit(1);

  if (backupUser.length === 0) {
    console.warn(
      `[garantia-escalador] backupId=${backupId} não encontrado em users — backup pulado garantia_id=${data.garantiaId}`,
    );
    return { backupNotificado: false, canal: [] };
  }

  const backup = backupUser[0];
  const canaisUtilizados: string[] = [];

  // Enviar e-mail para o backup
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
      `[garantia-escalador] Falha ao enviar e-mail de backup para backupId=${backupId} garantia_id=${data.garantiaId}:`,
      err,
    );
  }

  // Enviar WhatsApp para o backup se tiver número
  if (backup.whatsappNumero) {
    try {
      await enviarWhatsApp({
        para: backup.whatsappNumero,
        processoNumero: data.processoNumero,
        link: data.link,
        correlationId: `garantia-backup-wpp-${data.garantiaId}`,
      });
      canaisUtilizados.push('whatsapp');
      console.log(
        `[garantia-escalador] WhatsApp de backup enviado para backupId=${backupId} garantia_id=${data.garantiaId} org_id=${data.orgId}`,
      );
    } catch (err) {
      console.error(
        `[garantia-escalador] Falha ao enviar WhatsApp de backup para backupId=${backupId} garantia_id=${data.garantiaId}:`,
        err,
      );
    }
  }

  // Atualizar step e timestamp de backup
  await db
    .update(notificacaoGarantia)
    .set({
      step: 'backup_notificado',
      backupNotificadoEm: new Date(),
    })
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

    // Passo 2: verificar se já houve confirmação antes de enviar SMS/WhatsApp
    const confirmado = await step.run('verificar-confirmacao', () =>
      verificarConfirmacao(garantiaId),
    );

    if (confirmado) {
      console.log(
        `[garantia-escalador] confirmação recebida antes de SMS — encerrando garantia_id=${garantiaId} org_id=${orgId}`,
      );
      return { encerrado: 'confirmacao-antes-sms' };
    }

    // Passo 3: enviar SMS + WhatsApp para o responsável
    const resultadoCanal = await step.run('enviar-sms-whatsapp', () =>
      enviarCanalSecundario(data),
    );

    console.log(
      `[garantia-escalador] canal secundário enviado garantia_id=${garantiaId} org_id=${orgId}`,
      resultadoCanal,
    );

    // Passo 4: aguardar mais 2h
    await step.sleep('aguardar-mais-2h', '2h');

    // Passo 5: verificar novamente antes de notificar backup
    const confirmado2 = await step.run('verificar-confirmacao-2', () =>
      verificarConfirmacao(garantiaId),
    );

    if (confirmado2) {
      console.log(
        `[garantia-escalador] confirmação recebida antes de backup — encerrando garantia_id=${garantiaId} org_id=${orgId}`,
      );
      return { encerrado: 'confirmacao-antes-backup' };
    }

    // Passo 6: notificar contato backup
    const resultadoBackup = await step.run('notificar-backup', () =>
      notificarBackup(data),
    );

    console.log(
      `[garantia-escalador] protocolo completo garantia_id=${garantiaId} org_id=${orgId}`,
      resultadoBackup,
    );

    return {
      encerrado: 'protocolo-completo',
      canalSecundario: resultadoCanal,
      backup: resultadoBackup,
    };
  },
);
