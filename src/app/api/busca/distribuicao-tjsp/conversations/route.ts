import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { distribuicaoTjspConversations, distribuicaoTjspMessages } from '@/db/schema';
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
      id: distribuicaoTjspConversations.id,
      title: distribuicaoTjspConversations.title,
      createdAt: distribuicaoTjspConversations.createdAt,
      updatedAt: distribuicaoTjspConversations.updatedAt,
      messageCount: sql<number>`(SELECT COUNT(*) FROM distribuicao_tjsp_messages WHERE conversation_id = distribuicao_tjsp_conversations.id)`,
    })
    .from(distribuicaoTjspConversations)
    .where(and(
      eq(distribuicaoTjspConversations.orgId, ctx.orgId),
      eq(distribuicaoTjspConversations.userId, ctx.userId),
    ))
    .orderBy(desc(distribuicaoTjspConversations.updatedAt))
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
    messages: Array<{ role: 'user' | 'assistant'; text: string; processos?: unknown }>;
    apiMessages: unknown[];
  };

  const [conv] = await db.insert(distribuicaoTjspConversations).values({
    orgId: ctx.orgId,
    userId: ctx.userId,
    title: body.title.slice(0, 200),
    apiMessages: body.apiMessages,
  }).returning();

  if (body.messages?.length) {
    await db.insert(distribuicaoTjspMessages).values(
      body.messages.map((m) => ({
        conversationId: conv.id,
        role: m.role,
        text: m.text,
        processos: m.processos ?? null,
      })),
    );
  }

  return NextResponse.json({ conversation: conv }, { status: 201 });
}
