import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { djenConversations, djenMessages } from '@/db/schema';
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
      id: djenConversations.id,
      title: djenConversations.title,
      createdAt: djenConversations.createdAt,
      updatedAt: djenConversations.updatedAt,
      messageCount: sql<number>`(SELECT COUNT(*) FROM djen_messages WHERE conversation_id = djen_conversations.id)`,
    })
    .from(djenConversations)
    .where(and(
      eq(djenConversations.orgId, ctx.orgId),
      eq(djenConversations.userId, ctx.userId),
    ))
    .orderBy(desc(djenConversations.updatedAt))
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
    messages: Array<{ role: 'user' | 'assistant'; text: string; items?: unknown; total?: number; totalBruto?: number; params?: unknown }>;
    apiMessages: unknown[];
  };

  const [conv] = await db.insert(djenConversations).values({
    orgId: ctx.orgId,
    userId: ctx.userId,
    title: body.title.slice(0, 200),
    apiMessages: body.apiMessages,
  }).returning();

  if (body.messages?.length) {
    await db.insert(djenMessages).values(
      body.messages.map((m) => ({
        conversationId: conv.id,
        role: m.role,
        text: m.text,
        items: m.items ?? null,
        total: m.total ?? null,
        totalBruto: m.totalBruto ?? null,
        params: m.params ?? null,
      })),
    );
  }

  return NextResponse.json({ conversation: conv }, { status: 201 });
}
