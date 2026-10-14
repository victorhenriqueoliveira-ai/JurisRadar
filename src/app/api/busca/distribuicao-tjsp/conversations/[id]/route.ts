import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { distribuicaoTjspConversations, distribuicaoTjspMessages } from '@/db/schema';
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context';
import { eq, and, asc } from 'drizzle-orm';

async function getCtxAndConv(id: string) {
  const ctx = await requireOrgContext();
  const [conv] = await db
    .select()
    .from(distribuicaoTjspConversations)
    .where(and(
      eq(distribuicaoTjspConversations.id, id),
      eq(distribuicaoTjspConversations.orgId, ctx.orgId),
      eq(distribuicaoTjspConversations.userId, ctx.userId),
    ))
    .limit(1);
  return { ctx, conv };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let conv;
  try {
    ({ conv } = await getCtxAndConv(id));
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!conv) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  const messages = await db
    .select()
    .from(distribuicaoTjspMessages)
    .where(eq(distribuicaoTjspMessages.conversationId, id))
    .orderBy(asc(distribuicaoTjspMessages.createdAt));

  return NextResponse.json({ conversation: conv, messages });
}

// Adiciona mensagens e atualiza apiMessages
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let conv;
  try {
    ({ conv } = await getCtxAndConv(id));
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
  if (!conv) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  const body = await request.json() as {
    newMessages: Array<{ role: 'user' | 'assistant'; text: string; processos?: unknown }>;
    apiMessages: unknown[];
  };

  if (body.newMessages?.length) {
    await db.insert(distribuicaoTjspMessages).values(
      body.newMessages.map((m) => ({
        conversationId: id,
        role: m.role,
        text: m.text,
        processos: m.processos ?? null,
      })),
    );
  }
  await db
    .update(distribuicaoTjspConversations)
    .set({ apiMessages: body.apiMessages, updatedAt: new Date() })
    .where(eq(distribuicaoTjspConversations.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let conv;
  try {
    ({ conv } = await getCtxAndConv(id));
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
  if (!conv) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  await db.delete(distribuicaoTjspConversations).where(eq(distribuicaoTjspConversations.id, id));
  return new NextResponse(null, { status: 204 });
}
