/**
 * Inngest function: djeProcessoMatcher
 *
 * Disparado pelo evento `dje/dia.indexado` emitido pelo djeIndexer após
 * concluir o pipeline diário de indexação do DJE/TJSP.
 *
 * Pipeline:
 *   1. JOIN entre dje_publications e processos por número CNJ normalizado
 *   2. Insert idempotente de movimentações (externoId = 'dje-{pub_id}')
 *   3. Busca membros das orgs com processos encontrados
 *   4. Emite `notificacao/nova` por membro → notificacaoDispatcher manda e-mail
 *
 * Idempotência: externoId garante que a movimentação não é duplicada em re-runs.
 * O notificacaoDispatcher também protege por movimentacaoId.
 */

import { sql, inArray, eq, isNull } from 'drizzle-orm';
import { inngest } from './client';
import { db } from '@/db';
import { movimentacoes, orgMembers, subscriptions } from '@/db/schema';
import type { NotificacaoNovaPayload } from './notificacao-dispatcher';

// ── Tipos internos ─────────────────────────────────────────────────────────────

interface PublicacaoMatch {
  pub_id: string;
  content: string;
  publication_date: string;
  caderno: number;
  processo_id: string;
  org_id: string;
  numero_cnj: string;
  tribunal: string | null;
}

// ── Inngest Function ──────────────────────────────────────────────────────────

export const djeProcessoMatcher = inngest.createFunction(
  {
    id: 'dje-processo-matcher',
    name: 'DJE → CRM Matcher',
    retries: 3,
    triggers: [{ event: 'dje/dia.indexado' }],
  },
  async ({ event, step }) => {
    const { date } = event.data as { date: string };

    // Step 1: JOIN dje_publications × processos por CNJ normalizado (digits only)
    const matches = await step.run('match-publicacoes-processos', async () => {
      const rows = await db.execute(sql`
        SELECT
          dp.id            AS pub_id,
          dp.content       AS content,
          dp.publication_date::text AS publication_date,
          dp.caderno       AS caderno,
          p.id             AS processo_id,
          p.org_id         AS org_id,
          p.numero_cnj     AS numero_cnj,
          p.tribunal       AS tribunal
        FROM dje_publications dp
        JOIN processos p
          ON regexp_replace(dp.process_number, '[^0-9]', '', 'g')
           = regexp_replace(p.numero_cnj,      '[^0-9]', '', 'g')
        WHERE dp.publication_date = ${date}
          AND p.arquivado_at IS NULL
      `);

      return rows.rows as unknown as PublicacaoMatch[];
    });

    if (matches.length === 0) {
      console.log(`[dje-processo-matcher] nenhuma publicação coincide com processos do CRM para ${date}`);
      return { date, matched: 0, movimentacoes: 0, notificacoes: 0 };
    }

    console.log(`[dje-processo-matcher] ${matches.length} matches encontrados para ${date}`);

    // Step 2: insert movimentações idempotentes (ON CONFLICT DO NOTHING via externoId)
    const externoIds = matches.map((m) => `dje-${m.pub_id}`);

    const movimentacoesInseridas = await step.run('inserir-movimentacoes', async () => {
      const values = matches.map((m) => ({
        orgId: m.org_id,
        processoId: m.processo_id,
        data: new Date(m.publication_date + 'T12:00:00'),
        descricao: m.content.slice(0, 500),
        tipo: 'publicacao_dje',
        fonte: 'dje',
        externoId: `dje-${m.pub_id}`,
      }));

      const BATCH = 50;
      let inserted = 0;
      for (let i = 0; i < values.length; i += BATCH) {
        const batch = values.slice(i, i + BATCH);
        const result = await db
          .insert(movimentacoes)
          .values(batch)
          .onConflictDoNothing()
          .returning({ id: movimentacoes.id });
        inserted += result.length;
      }
      return inserted;
    });

    // Step 3: buscar IDs das movimentações (novas e já existentes) por externoId
    const movRows = await step.run('buscar-ids-movimentacoes', async () => {
      const rows = await db.execute(sql`
        SELECT id, processo_id, org_id, externo_id, descricao
        FROM movimentacoes
        WHERE externo_id = ANY(${externoIds})
      `);
      return rows.rows as Array<{
        id: string;
        processo_id: string;
        org_id: string;
        externo_id: string;
        descricao: string;
      }>;
    });

    if (movRows.length === 0) {
      return { date, matched: matches.length, movimentacoes: 0, notificacoes: 0 };
    }

    // Step 4: buscar membros das orgs com assinatura ativa para notificar
    const orgIds = Array.from(new Set(movRows.map((r) => r.org_id)));

    const membros = await step.run('buscar-membros-orgs', async () => {
      // Filtra só orgs com assinatura ativa ou em trial
      const orgsAtivas = await db
        .select({ orgId: subscriptions.orgId })
        .from(subscriptions)
        .where(
          inArray(subscriptions.status, ['active', 'trialing']),
        );

      const orgIdsAtivos = orgsAtivas
        .map((o) => o.orgId)
        .filter((id) => orgIds.includes(id));

      if (orgIdsAtivos.length === 0) return [];

      return db
        .select({
          userId: orgMembers.userId,
          orgId: orgMembers.orgId,
        })
        .from(orgMembers)
        .where(inArray(orgMembers.orgId, orgIdsAtivos));
    });

    if (membros.length === 0) {
      return { date, matched: matches.length, movimentacoes: movimentacoesInseridas, notificacoes: 0 };
    }

    // Montar mapa orgId → processoId e match info para o payload
    const matchByExternoId = new Map(
      matches.map((m) => [`dje-${m.pub_id}`, m]),
    );
    const movByOrgId = new Map<string, typeof movRows>();
    for (const mov of movRows) {
      const list = movByOrgId.get(mov.org_id) ?? [];
      list.push(mov);
      movByOrgId.set(mov.org_id, list);
    }

    // Step 5: emitir notificacao/nova por (membro, movimentação)
    const eventos: Array<{ name: string; data: NotificacaoNovaPayload }> = [];

    for (const membro of membros) {
      const movs = movByOrgId.get(membro.orgId) ?? [];
      for (const mov of movs) {
        const match = matchByExternoId.get(mov.externo_id);
        if (!match) continue;

        eventos.push({
          name: 'notificacao/nova' as const,
          data: {
            movimentacaoId: mov.id,
            orgId: membro.orgId,
            userId: membro.userId,
            tipo: 'publicacao_dje',
            titulo: `Publicação no DJE/TJSP: ${match.numero_cnj}`,
            processoId: match.processo_id,
            numeroCnj: match.numero_cnj,
            tribunal: match.tribunal ?? 'TJSP',
            descricao: match.content.slice(0, 300),
          },
        });
      }
    }

    if (eventos.length > 0) {
      // Inngest limita a 512 eventos por sendEvent — enviar em lotes
      const EVENT_BATCH = 500;
      for (let i = 0; i < eventos.length; i += EVENT_BATCH) {
        const lote = eventos.slice(i, i + EVENT_BATCH);
        await step.sendEvent(`emitir-notificacoes-${i}`, lote);
      }
    }

    console.log(
      `[dje-processo-matcher] concluído date=${date} matched=${matches.length} movimentacoes=${movimentacoesInseridas} notificacoes=${eventos.length}`,
    );

    return {
      date,
      matched: matches.length,
      movimentacoes: movimentacoesInseridas,
      notificacoes: eventos.length,
    };
  },
);
