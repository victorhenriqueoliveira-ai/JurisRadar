import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { buscaIaConversations, buscaIaMessages } from '@/db/schema';
import { requireOrgContext, UnauthorizedError } from '@/lib/org-context';
import { desc, eq, and, sql } from 'drizzle-orm';

export async function GET() {
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const conversations = await db
    .select({
      id: buscaIaConversations.id,
      title: buscaIaConversations.title,
      createdAt: buscaIaConversations.createdAt,
      updatedAt: buscaIaConversations.updatedAt,
      messageCount: sql<number>`(SELECT COUNT(*) FROM busca_ia_messages WHERE conversation_id = busca_ia_conversations.id)`,
    })
    .from(buscaIaConversations)
    .where(and(
      eq(buscaIaConversations.orgId, ctx.orgId),
      eq(buscaIaConversations.userId, ctx.userId),
    ))
    .orderBy(desc(buscaIaConversations.updatedAt))
    .limit(50);

  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  const body = await request.json() as {
    title: string;
    messages: Array<{ role: 'user' | 'assistant'; text: string; sources?: unknown; params?: unknown }>;
    apiMessages: unknown[];
  };

  const [conv] = await db.insert(buscaIaConversations).values({
    orgId: ctx.orgId,
    userId: ctx.userId,
    title: body.title.slice(0, 200),
    apiMessages: body.apiMessages,
  }).returning();

  if (body.messages?.length) {
    await db.insert(buscaIaMessages).values(
      body.messages.map((m) => ({
        conversationId: conv.id,
        role: m.role,
        text: m.text,
        sources: m.sources ?? null,
        params: m.params ?? null,
      })),
    );
  }

  return NextResponse.json({ conversation: conv }, { status: 201 });
}
