import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { buscaIaConversations, buscaIaMessages } from '@/db/schema';
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context';
import { eq, and, asc } from 'drizzle-orm';

async function getCtxAndConv(id: string) {
  const ctx = await requireOrgContext();
  const [conv] = await db
    .select()
    .from(buscaIaConversations)
    .where(and(
      eq(buscaIaConversations.id, id),
      eq(buscaIaConversations.orgId, ctx.orgId),
      eq(buscaIaConversations.userId, ctx.userId),
    ))
    .limit(1);
  return { ctx, conv };
}

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
    .from(buscaIaMessages)
    .where(eq(buscaIaMessages.conversationId, id))
    .orderBy(asc(buscaIaMessages.createdAt));

  return NextResponse.json({ conversation: conv, messages });
}

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
    newMessages: Array<{ role: 'user' | 'assistant'; text: string; sources?: unknown; params?: unknown }>;
    apiMessages: unknown[];
  };

  // Neon HTTP driver não suporta transações — queries sequenciais
  if (body.newMessages?.length) {
    await db.insert(buscaIaMessages).values(
      body.newMessages.map((m) => ({
        conversationId: id,
        role: m.role,
        text: m.text,
        sources: m.sources ?? null,
        params: m.params ?? null,
      })),
    );
  }
  await db
    .update(buscaIaConversations)
    .set({ apiMessages: body.apiMessages, updatedAt: new Date() })
    .where(eq(buscaIaConversations.id, id));

  return NextResponse.json({ ok: true });
}

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

  await db.delete(buscaIaConversations).where(eq(buscaIaConversations.id, id));
  return new NextResponse(null, { status: 204 });
}
