# Contexto — task_02

## Requisitos do PRD

Task crítica — tudo depende deste schema. Multi-tenancy via row-level isolation (org_id em todas as tabelas de domínio). Nenhum dado de usuário existente pode ser perdido.

## Especificação Técnica

### Data Models (TechSpec seção "Data Models")

**Stack:** PostgreSQL via Neon serverless + Drizzle ORM. Arquivo principal: `src/db/schema.ts`.

**10 novas tabelas:**

```sql
organizations (id uuid PK, name text NOT NULL, slug text UNIQUE NOT NULL, created_at timestamptz)

org_members (id uuid PK, org_id uuid FK organizations CASCADE, user_id uuid FK users CASCADE, role text CHECK('socio','associado','estagiario'), UNIQUE(org_id, user_id))

subscriptions (id uuid PK, org_id uuid FK organizations UNIQUE, stripe_customer_id text NOT NULL, stripe_subscription_id text UNIQUE, status text NOT NULL, plan text NOT NULL, trial_ends_at timestamptz, current_period_end timestamptz, stripe_event_id text UNIQUE)

processos (id uuid PK, org_id uuid FK organizations NOT NULL, numero_cnj text NOT NULL, tribunal text, area_direito text, status text DEFAULT 'ativo', responsavel_id uuid FK users, ultima_movimentacao text, ultima_sync_at timestamptz, fonte_sync text[], arquivado_at timestamptz, created_at timestamptz, INDEX(org_id,status), INDEX(org_id,responsavel_id))

movimentacoes (id uuid PK, org_id uuid FK organizations NOT NULL, processo_id uuid FK processos CASCADE, data timestamptz NOT NULL, descricao text NOT NULL, tipo text, fonte text, externo_id text, UNIQUE(processo_id,externo_id), INDEX(processo_id,data DESC), INDEX(org_id,data DESC))

notificacoes (id uuid PK, org_id uuid FK organizations NOT NULL, user_id uuid FK users, processo_id uuid FK processos, tipo text NOT NULL, titulo text NOT NULL, corpo text, lida bool DEFAULT false, lida_at timestamptz, created_at timestamptz, INDEX(user_id,lida,created_at DESC))

honorarios (id uuid PK, org_id uuid FK organizations NOT NULL, processo_id uuid FK processos UNIQUE, tipo text NOT NULL, valor numeric(12,2), data_prevista date, status_pagamento text DEFAULT 'pendente', INDEX(org_id,status_pagamento))

pagamentos (id uuid PK, org_id uuid FK organizations NOT NULL, honorario_id uuid FK honorarios CASCADE, valor numeric(12,2) NOT NULL, pago_em date NOT NULL, observacao text)

notas_processo (id uuid PK, org_id uuid FK organizations NOT NULL, processo_id uuid FK processos CASCADE, user_id uuid FK users, conteudo text NOT NULL, created_at timestamptz)

eventos_calendario (id uuid PK, org_id uuid FK organizations NOT NULL, processo_id uuid FK processos CASCADE, tipo text NOT NULL, titulo text NOT NULL, data date NOT NULL, alertado_t5 bool DEFAULT false, alertado_t2 bool DEFAULT false, alertado_t1 bool DEFAULT false, INDEX(org_id,data))
```

**Tabelas existentes a modificar:**
- `users`: adicionar `cpf text`, `oab_numero text`, `oab_estado text(2)`, `totp_secret text`
- `searches`: adicionar `org_id uuid FK organizations(id)` (nullable para compatibilidade retroativa)
- `djeSearches`: adicionar `org_id uuid FK organizations(id)` (nullable)

### ADR-002 resumo
Row-level isolation: toda query filtra por `org_id`. Disciplina obrigatória de código. Helper `requireOrgContext()` em `src/lib/org-context.ts` (task_03 cria — esta task só define schema).

## Arquivos existentes relevantes

- `src/db/schema.ts` — schema Drizzle atual com: `users`, `searches`, `searchResults`, `searchCache`, `djeEditions`, `djePublications`, `djeSearches`
- `drizzle.config.ts` — configuração drizzle-kit
- `src/db/migrations/` — pasta de migrations existentes

## Arquivos a criar/modificar

- `src/db/schema.ts` — MODIFICAR: adicionar todas as 10 novas tabelas + colunas em tabelas existentes
- `src/db/migrations/XXXX_add_saas_schema.sql` — gerado por `drizzle-kit generate`
- `src/db/migrations/XXXX_backfill_existing_users.sql` — migration manual de segurança

## Notas de implementação críticas

1. **NUNCA dropar colunas** — apenas adicionar
2. **Migration de backfill**: para cada user existente sem org, INSERT em organizations + INSERT em org_members como 'socio'
3. Gerar migration: `pnpm drizzle-kit generate` — revisar SQL antes de aplicar
4. Aplicar em dev: `pnpm drizzle-kit migrate`
5. Verificar todos os índices obrigatórios via `pg_indexes` após migration
6. Testes: usar Vitest com banco real (ou pg-mem para testes unitários de schema)
7. Meta de cobertura: ≥80%

## Comandos úteis

```bash
cd /Users/victorhenriqueoliveira/Documents/Projetos/Victor/JurisRadar/.worktrees/jurisradar-saas/task_02
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```
