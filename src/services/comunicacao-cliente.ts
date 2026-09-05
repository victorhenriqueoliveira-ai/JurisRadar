/**
 * ComunicacaoClienteService — envia e-mail/WhatsApp ao cliente e persiste histórico.
 *
 * Regra de resiliência: falha no Resend NÃO impede o registro em comunicacoes_cliente.
 */

import { and, desc, eq } from 'drizzle-orm';
import React from 'react';
import { db } from '@/db';
import { clientes, comunicacoesCliente, processos } from '@/db/schema';
import { sendEmail } from '@/lib/email/send';
import { buildWaLink } from '@/lib/comunicacao-cliente';
import { NotificacaoCliente } from '@/lib/email/templates/NotificacaoCliente';
import type { EmailClienteParams } from '@/lib/comunicacao-cliente';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface RegistrarComunicacaoInput {
  orgId: string;
  clienteId: string;
  processoId?: string;
  canal: 'email' | 'whatsapp';
  mensagem: string;
  enviadoPor: string;
}

export interface ComunicacaoClienteItem {
  id: string;
  clienteId: string;
  processoId: string | null;
  canal: string;
  mensagem: string;
  enviadoPor: string;
  createdAt: Date;
}

// ── Service ────────────────────────────────────────────────────────────────────

export async function registrar(input: RegistrarComunicacaoInput): Promise<{ id: string }> {
  const [row] = await db
    .insert(comunicacoesCliente)
    .values({
      orgId: input.orgId,
      clienteId: input.clienteId,
      processoId: input.processoId ?? null,
      canal: input.canal,
      mensagem: input.mensagem,
      enviadoPor: input.enviadoPor,
    })
    .returning({ id: comunicacoesCliente.id });

  return { id: row.id };
}

export async function listarPorProcesso(
  processoId: string,
  orgId: string,
  page = 1,
  limit = 20,
): Promise<ComunicacaoClienteItem[]> {
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: comunicacoesCliente.id,
      clienteId: comunicacoesCliente.clienteId,
      processoId: comunicacoesCliente.processoId,
      canal: comunicacoesCliente.canal,
      mensagem: comunicacoesCliente.mensagem,
      enviadoPor: comunicacoesCliente.enviadoPor,
      createdAt: comunicacoesCliente.createdAt,
    })
    .from(comunicacoesCliente)
    .where(
      and(
        eq(comunicacoesCliente.processoId, processoId),
        eq(comunicacoesCliente.orgId, orgId),
      ),
    )
    .orderBy(desc(comunicacoesCliente.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

// ── Helpers internos ───────────────────────────────────────────────────────────

export async function enviarEmailCliente(params: EmailClienteParams & {
  clienteEmail: string;
}): Promise<{ enviado: boolean; erro?: string }> {
  try {
    await sendEmail({
      to: params.clienteEmail,
      subject: `Atualização do processo ${params.processoNumCnj}`,
      react: React.createElement(NotificacaoCliente, params),
    });
    return { enviado: true };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error(`[comunicacao-cliente] falha no envio de e-mail: ${mensagem}`);
    return { enviado: false, erro: mensagem };
  }
}

export async function gerarWhatsAppLink(telefone: string, mensagem: string): Promise<string> {
  return buildWaLink(telefone, mensagem);
}

export async function upsertCliente(params: {
  orgId: string;
  nome: string;
  email?: string;
  whatsapp?: string;
  cpfCnpj?: string;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(clientes)
    .values({
      orgId: params.orgId,
      nome: params.nome,
      email: params.email,
      whatsapp: params.whatsapp,
      cpfCnpj: params.cpfCnpj,
    })
    .onConflictDoUpdate({
      target: [clientes.orgId, clientes.cpfCnpj],
      set: {
        nome: params.nome,
        email: params.email,
        whatsapp: params.whatsapp,
      },
    })
    .returning({ id: clientes.id });

  return { id: row.id };
}

export async function verificarProcessoOrg(
  processoId: string,
  orgId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: processos.id })
    .from(processos)
    .where(and(eq(processos.id, processoId), eq(processos.orgId, orgId)))
    .limit(1);

  return rows.length > 0;
}
