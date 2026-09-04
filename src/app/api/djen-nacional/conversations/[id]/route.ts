import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { djenConversations, djenMessages } from '@/db/schema';
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context';
import { eq, and, asc } from 'drizzle-orm';

async function getCtxAndConv(id: string) {
  const ctx = await requireOrgContext();
  const [conv] = await db
    .select()
    .from(djenConversations)
    .where(and(eq(djenConversations.id, id), eq(djenConversations.orgId, ctx.orgId), eq(djenConversations.userId, ctx.userId)))
    .limit(1);
  return { ctx, conv };
}

// Busca conversa completa com mensagens
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let conv, ctx;
  try {
    ({ ctx, conv } = await getCtxAndConv(id));
    void ctx;
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!conv) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  const messages = await db
    .select()
    .from(djenMessages)
    .where(eq(djenMessages.conversationId, id))
    .orderBy(asc(djenMessages.createdAt));

  return NextResponse.json({ conversation: conv, messages });
}

// Adiciona mensagens e atualiza apiMessages
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let conv, ctx;
  try {
    ({ ctx, conv } = await getCtxAndConv(id));
    void ctx;
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
  if (!conv) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  const body = await request.json() as {
    newMessages: Array<{ role: 'user' | 'assistant'; text: string; items?: unknown; total?: number; totalBruto?: number; params?: unknown }>;
    apiMessages: unknown[];
  };

  await db.transaction(async (tx) => {
    if (body.newMessages?.length) {
      await tx.insert(djenMessages).values(
        body.newMessages.map((m) => ({
          conversationId: id,
          role: m.role,
          text: m.text,
          items: m.items ?? null,
          total: m.total ?? null,
          totalBruto: m.totalBruto ?? null,
          params: m.params ?? null,
        })),
      );
    }
    await tx
      .update(djenConversations)
      .set({ apiMessages: body.apiMessages, updatedAt: new Date() })
      .where(eq(djenConversations.id, id));
  });

  return NextResponse.json({ ok: true });
}

// Deleta conversa (cascade apaga mensagens)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let conv, ctx;
  try {
    ({ ctx, conv } = await getCtxAndConv(id));
    void ctx;
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
  if (!conv) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  await db.delete(djenConversations).where(eq(djenConversations.id, id));
  return new NextResponse(null, { status: 204 });
}
