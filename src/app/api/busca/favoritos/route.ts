/**
 * API de Favoritos de Busca
 *
 * Favoritos são armazenados no localStorage do browser (ver BuscaFavoritos.tsx).
 * Esta rota serve como endpoint reserva — caso o front precise persistência server-side.
 *
 * GET /api/busca/favoritos — lista favoritos do usuário autenticado
 * POST /api/busca/favoritos — salva um novo favorito
 * DELETE /api/busca/favoritos?id={id} — remove um favorito
 *
 * Nota: A implementação principal usa localStorage para simplicidade (v1).
 * Esta rota pode ser expandida para usar DB em versão futura.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgContext } from '@/lib/org-context';
import { UnauthorizedError } from '@/lib/errors';

// Favoritos em memória por usuário (simples, suficiente para v1 server-side)
// Em produção real usar tabela no banco.
const _store = new Map<string, Array<{ id: string; nome: string; fonte: string; params: Record<string, string>; createdAt: string }>>();

function getUserKey(userId: string, orgId: string) {
  return `${orgId}:${userId}`;
}

export async function GET() {
  let ctx: Awaited<ReturnType<typeof requireOrgContext>>;
  try {
    ctx = await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    throw err;
  }

  const key = getUserKey(ctx.userId, ctx.orgId);
  const favoritos = _store.get(key) ?? [];

  return NextResponse.json({ favoritos }, { status: 200 });
}

export async function POST(request: NextRequest) {
  let ctx: Awaited<ReturnType<typeof requireOrgContext>>;
  try {
    ctx = await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 422 });
  }

  const { nome, fonte, params } = body as { nome?: string; fonte?: string; params?: Record<string, string> };

  if (!nome || !fonte || !params) {
    return NextResponse.json({ error: 'nome, fonte e params são obrigatórios' }, { status: 422 });
  }

  const key = getUserKey(ctx.userId, ctx.orgId);
  const existing = _store.get(key) ?? [];

  // Limita a 50 favoritos por usuário
  if (existing.length >= 50) {
    existing.pop(); // remove o mais antigo
  }

  const novo = {
    id: crypto.randomUUID(),
    nome,
    fonte,
    params,
    createdAt: new Date().toISOString(),
  };

  _store.set(key, [novo, ...existing]);

  return NextResponse.json({ favorito: novo }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  let ctx: Awaited<ReturnType<typeof requireOrgContext>>;
  try {
    ctx = await requireOrgContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 422 });
  }

  const key = getUserKey(ctx.userId, ctx.orgId);
  const existing = _store.get(key) ?? [];
  const found = existing.find((f) => f.id === id);

  if (!found) {
    return NextResponse.json({ error: 'Favorito não encontrado' }, { status: 404 });
  }

  _store.set(key, existing.filter((f) => f.id !== id));

  return NextResponse.json({ message: 'Favorito removido' }, { status: 200 });
}
