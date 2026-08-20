# TechSpec — JurisRadar: Busca e Monitoramento de Processos Judiciais

## Executive Summary

O JurisRadar é uma aplicação Next.js full-stack (App Router) hospedada na Vercel que consulta a API pública DataJud do CNJ para localizar processos judiciais em ~90 tribunais simultaneamente. O principal trade-off da arquitetura é a **busca federada assíncrona**: como uma única invocação de função serverless não pode sustentar 90 requisições HTTP paralelas dentro do limite de timeout da Vercel, o processamento é orquestrado pelo Inngest em lotes de 10 tribunais por step, com estado persistido no Neon Postgres entre invocações. O frontend faz polling do status do job até a conclusão, exibindo progresso parcial em tempo real.

A stack completa é: **Next.js 14 (App Router)** · **Neon Postgres** · **Drizzle ORM** · **NextAuth.js v5** · **Inngest** · **shadcn/ui + Tailwind CSS**. Nenhum serviço Python separado existe — toda a lógica de backend vive em Route Handlers e funções Inngest.

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js frontend)                             │
│  - Painel de filtros, lista de resultados, histórico    │
│  - Polling a cada 3s via /api/searches/[id]             │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│  Next.js App Router (Vercel Functions)                  │
│                                                         │
│  middleware.ts ──── NextAuth.js v5 (JWT)                │
│                                                         │
│  Route Handlers:                                        │
│  POST /api/searches          → cria job + dispara Inngest│
│  GET  /api/searches          → lista histórico          │
│  GET  /api/searches/[id]     → status + resultados      │
│  POST /api/searches/[id]/rerun → clona e reinicia job   │
│  GET  /api/searches/[id]/export → stream CSV            │
│  POST /api/inngest           → webhook Inngest          │
└──────┬──────────────────────────────────┬───────────────┘
       │                                  │
┌──────▼──────────┐            ┌──────────▼──────────────┐
│  Neon Postgres  │            │  Inngest                │
│  (Drizzle ORM)  │            │                         │
│  - users        │◄───────────│  federated-search fn    │
│  - searches     │   persiste │  step 1: init           │
│  - search_results│  progresso│  step 2..N: batch i     │
│  - search_cache │            │  step final: complete   │
└─────────────────┘            └──────────┬──────────────┘
                                          │ fetch paralelo
                               ┌──────────▼──────────────┐
                               │  DataJud API (CNJ)      │
                               │  ~90 endpoints          │
                               │  api-publica.datajud... │
                               └─────────────────────────┘
```

**Componentes e responsabilidades:**

| Componente | Responsabilidade |
|---|---|
| `middleware.ts` | Intercepta todas as rotas; redireciona para `/login` se sem sessão JWT válida. Exclui `/login`, `/api/auth/*`, `/api/inngest`. |
| `src/auth.ts` | Configuração NextAuth.js v5: Credentials provider, hash bcrypt, JWT session. |
| `Route Handlers (/api/searches)` | CRUD de jobs de busca: criação, listagem, leitura de status/resultados, reexecução, exportação CSV. |
| `src/inngest/federated-search.ts` | Função Inngest que processa os ~90 tribunais em batches, persiste progresso e resultados no banco. |
| `src/lib/datajud/` | Cliente HTTP para DataJud: query builder (Elasticsearch DSL), retry com backoff, mapeamento de resposta para domínio. |
| `src/lib/export/csv.ts` | Geração de CSV streamado a partir dos resultados de uma busca. |
| `src/db/schema.ts` | Schemas Drizzle: `users`, `searches`, `search_results`, `search_cache`. |

---

## Implementation Design

### Core Interfaces

```typescript
// src/lib/datajud/types.ts

export interface SearchFilters {
  assunto?: string[];           // texto livre ou código do assunto
  classe?: string[];            // código da classe processual CNJ
  grau?: ('G1' | 'G2' | 'JE' | 'SUP')[];
  dataDistribuicaoInicio?: string; // ISO 8601 date: "2025-01-01"
  dataDistribuicaoFim?: string;
  buscaLivre?: string;
}

export interface ProcessoResult {
  numero: string;               // CNJ format — obrigatório
  tribunal: string;             // sigla: "TJSP", "TRF3", etc.
  grau: string;
  classe?: string;
  assunto?: string;
  dataDistribuicao?: string;
  orgaoJulgador?: string;
  partes?: { polo: 'ativo' | 'passivo'; nome: string }[];
  ultimaMovimentacao?: { data: string; descricao: string };
}

export type SearchStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'partial'   // concluída com falhas em alguns tribunais
  | 'failed';

export interface SearchJob {
  id: string;
  userId: string;
  name?: string;
  filters: SearchFilters;
  status: SearchStatus;
  processedTribunals: string[];
  failedTribunals: string[];
  totalTribunals: number;
  totalResults: number;
  createdAt: Date;
  completedAt?: Date;
}
```

```typescript
// src/lib/datajud/client.ts — assinatura central do cliente DataJud

export async function queryTribunal(
  tribunal: string,
  filters: SearchFilters,
  from: number = 0,
  size: number = 100,
): Promise<{ hits: ProcessoResult[]; total: number }>;
// Lança DataJudRateLimitError (429) ou DataJudUnavailableError (5xx).
// Retries com backoff exponencial: 3 tentativas, delay inicial 1s.
```

### Data Models

```typescript
// src/db/schema.ts (Drizzle)

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name:         text('name'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
});

export const searches = pgTable('searches', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  userId:              uuid('user_id').notNull().references(() => users.id),
  name:                text('name'),
  filters:             jsonb('filters').$type<SearchFilters>().notNull(),
  status:              text('status').$type<SearchStatus>().notNull().default('pending'),
  processedTribunals:  text('processed_tribunals').array().notNull().default([]),
  failedTribunals:     text('failed_tribunals').array().notNull().default([]),
  totalTribunals:      integer('total_tribunals').notNull(),
  totalResults:        integer('total_results').notNull().default(0),
  cacheKey:            text('cache_key'),          // hash SHA-256 dos filtros
  startedAt:           timestamp('started_at'),
  completedAt:         timestamp('completed_at'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
});

export const searchResults = pgTable('search_results', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  searchId:            uuid('search_id').notNull().references(() => searches.id, { onDelete: 'cascade' }),
  numero:              text('numero').notNull(),
  tribunal:            text('tribunal').notNull(),
  grau:                text('grau').notNull(),
  classe:              text('classe'),
  assunto:             text('assunto'),
  dataDistribuicao:    date('data_distribuicao'),
  orgaoJulgador:       text('orgao_julgador'),
  partes:              jsonb('partes').$type<ProcessoResult['partes']>(),
  ultimaMovimentacao:  jsonb('ultima_movimentacao').$type<ProcessoResult['ultimaMovimentacao']>(),
  // rawData NÃO armazenado — minimização LGPD
});

// Cache: reusa resultados de buscas idênticas dentro do TTL (1h)
export const searchCache = pgTable('search_cache', {
  cacheKey:    text('cache_key').primaryKey(),  // SHA-256 dos filtros
  searchId:    uuid('search_id').notNull().references(() => searches.id),
  expiresAt:   timestamp('expires_at').notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
});
```

**Índices obrigatórios:**
- `searches(user_id, created_at DESC)` — listagem de histórico por usuário
- `searches(cache_key)` — lookup de cache antes de criar novo job
- `search_results(search_id)` — paginação de resultados por busca

### API Endpoints

**Autenticação**

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | NextAuth.js: login, logout, session |

**Buscas**

| Método | Rota | Request | Response |
|---|---|---|---|
| `POST` | `/api/searches` | `{ filters: SearchFilters, name?: string }` | `201 { id, status: 'pending' }` |
| `GET` | `/api/searches` | `?page=1&limit=20` | `200 { searches: SearchJob[], total }` |
| `GET` | `/api/searches/[id]` | `?page=1&limit=50` | `200 { search: SearchJob, results: ProcessoResult[], total }` |
| `POST` | `/api/searches/[id]/rerun` | — | `201 { id, status: 'pending' }` (novo job com mesmos filtros) |
| `GET` | `/api/searches/[id]/export` | `?formato=csv` | `200 text/csv` stream |

**Códigos de erro:**
- `401` — não autenticado
- `403` — busca não pertence ao usuário
- `404` — busca não encontrada
- `422` — filtros inválidos (nenhum filtro preenchido)
- `503` — DataJud indisponível (retornado no status do job, não no HTTP)

**Lógica de cache em `POST /api/searches`:**
1. Calcular `cacheKey = SHA-256(JSON.stringify(filters normalizado))`.
2. Verificar `search_cache` onde `cache_key = ?` e `expires_at > NOW()`.
3. Se hit: retornar `{ id: cached.searchId, status: 'completed', cached: true }` — sem disparar Inngest.
4. Se miss: criar novo `searches` record, disparar evento Inngest `search/created`, inserir `search_cache` com TTL de 1 hora.

---

## Integration Points

### DataJud API (CNJ)

- **URL base:** `https://api-publica.datajud.cnj.jus.br/{tribunal_alias}/_search`
- **Autenticação:** `Authorization: APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==` (chave pública; armazenar em variável de ambiente `DATAJUD_API_KEY` para facilitar rotação).
- **Método:** `POST` com body `application/json` contendo Elasticsearch DSL.
- **Rate limit:** ~60 req/min por endpoint de tribunal. O cliente DataJud mantém um token bucket por tribunal: se o limite for atingido, espera `Retry-After` antes de retentar.
- **Retry policy:** 3 tentativas com backoff exponencial (1s, 2s, 4s). Erro 429 → espera `Retry-After`. Erro 5xx → backoff. Erro 4xx (exceto 429) → não retentar.
- **Tribunais cobertos:** lista estática de ~90 siglas em `src/lib/datajud/tribunals.ts` (atualizar manualmente quando CNJ adicionar novos tribunais).

**Query Elasticsearch DSL (exemplo para filtros do MVP):**
```json
{
  "size": 100,
  "from": 0,
  "query": {
    "bool": {
      "must": [
        { "match": { "dadosBasicos.assunto.descricao": "pensão alimentícia" } },
        { "term":  { "dadosBasicos.grau": "G1" } },
        { "range": {
            "dadosBasicos.dataAjuizamento": {
              "gte": "2025-01-01",
              "lte": "2026-01-01"
            }
          }
        }
      ]
    }
  }
}
```

**Mapeamento de resposta DataJud → `ProcessoResult`:**
- `dadosBasicos.numero` → `numero`
- `dadosBasicos.siglaTribunal` → `tribunal`
- `dadosBasicos.grau` → `grau`
- `dadosBasicos.classe.descricao` → `classe`
- `dadosBasicos.assunto[0].descricao` → `assunto`
- `dadosBasicos.dataAjuizamento` → `dataDistribuicao`
- `dadosBasicos.orgaoJulgador.nomeOrgao` → `orgaoJulgador`
- `dadosBasicos.polo` → `partes` (filtrar apenas `nome`, sem CPF/documento — minimização LGPD)
- `movimentos[0]` → `ultimaMovimentacao`

### Inngest

- **SDK:** `inngest` + `@inngest/next`
- **Rota webhook:** `POST /api/inngest` (pública, excluída do middleware auth; validada por `INNGEST_SIGNING_KEY`)
- **Evento de trigger:** `search/created` com payload `{ searchId: string, filters: SearchFilters }`
- **Função:** `federated-search` — processa 9 steps de 10 tribunais cada (90 tribunais ÷ 10 por batch)
- **Retry por step:** configurado para 2 retries automáticos pelo Inngest antes de marcar o step como falha
- **Variáveis:** `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`

**Estrutura da função Inngest:**
```typescript
// src/inngest/federated-search.ts
export const federatedSearch = inngest.createFunction(
  { id: 'federated-search', retries: 0 }, // retries por step, não por função
  { event: 'search/created' },
  async ({ event, step }) => {
    const { searchId, filters } = event.data;

    // Atualizar status para 'processing'
    await step.run('mark-processing', () =>
      db.update(searches).set({ status: 'processing', startedAt: new Date() })
        .where(eq(searches.id, searchId))
    );

    // Processar tribunais em batches de 10
    const batches = chunk(DATAJUD_TRIBUNALS, 10);
    for (const [i, batch] of batches.entries()) {
      await step.run(`batch-${i}`, async () => {
        const settled = await Promise.allSettled(
          batch.map(t => queryTribunal(t, filters))
        );
        await persistBatchResults(searchId, batch, settled);
      });
    }

    // Finalizar
    await step.run('finalize', () => finalizeSearch(searchId));
  }
);
```

---

## Impact Analysis

| Componente | Tipo de Impacto | Descrição e Risco | Ação Necessária |
|---|---|---|---|
| `src/db/schema.ts` | Novo | 4 tabelas novas; toda a persistência depende deste schema | Criar + migrar antes de qualquer outro componente |
| `src/auth.ts` + `middleware.ts` | Novo | Controla acesso a todas as rotas protegidas | Implementar e testar antes das rotas de negócio |
| `src/lib/datajud/` | Novo | Ponto único de integração com DataJud; falha aqui afeta toda a busca | Testar com chave real antes de integrar ao Inngest |
| `src/inngest/federated-search.ts` | Novo | Caminho crítico da feature principal; falha de step pode deixar jobs presos em 'processing' | Implementar lógica de timeout/cleanup para jobs órfãos |
| `POST /api/searches` | Novo | Cria jobs e dispara Inngest; verificação de cache crítica para rate limit DataJud | Testar cache hit e cache miss |
| `GET /api/searches/[id]` | Novo | Rota mais consultada (polling a cada 3s); deve ser eficiente | Índice em `search_results(search_id)` obrigatório |
| `GET /api/searches/[id]/export` | Novo | Stream CSV de N resultados; risco de timeout para buscas com muitos resultados | Usar Response stream; não bufferizar em memória |
| Frontend — polling hook | Novo | `useSearchStatus(id)` faz polling a cada 3s; deve parar ao completar | Cleanup do interval no unmount |

---

## Testing Approach

### Unit Tests

- **`src/lib/datajud/query-builder.ts`:** testar que cada filtro gera o DSL Elasticsearch correto. Casos: filtro vazio (deve lançar erro de validação), assunto com múltiplos valores, grau único, combinação de filtros.
- **`src/lib/datajud/client.ts`:** mockar `fetch`; testar retry em 429 com `Retry-After`, retry em 503, sem retry em 400.
- **`src/lib/export/csv.ts`:** testar que `ProcessoResult[]` gera CSV com cabeçalho correto e valores escapados (vírgulas e aspas em nomes de partes).
- **Cache key:** testar que a normalização dos filtros gera o mesmo hash independente da ordem das chaves.

### Integration Tests

- **Fluxo de criação de busca:** `POST /api/searches` → verificar registro em `searches` com status `pending` + evento Inngest disparado (mockar Inngest SDK).
- **Fluxo de cache:** segunda busca com filtros idênticos dentro do TTL → verificar que retorna `cached: true` sem criar novo job.
- **Exportação CSV:** busca com 10 resultados mockados → `GET /api/searches/[id]/export` → verificar Content-Type e contagem de linhas.
- **Auth middleware:** requisição sem cookie JWT válido para `/api/searches` → verificar `401`.
- **Isolamento de dados:** usuário B não pode acessar busca do usuário A → verificar `403`.

---

## Development Sequencing

### Build Order

1. **Infraestrutura base** — sem dependências
   - Criar projeto Next.js 14 com App Router + TypeScript
   - Configurar Neon Postgres + variável `DATABASE_URL`
   - Instalar Drizzle ORM + `drizzle-kit`; criar `src/db/schema.ts` com as 4 tabelas
   - Executar `drizzle-kit generate` + `drizzle-kit migrate`

2. **Autenticação** — depende do passo 1
   - Instalar NextAuth.js v5
   - Criar `src/auth.ts` com Credentials provider + bcrypt
   - Criar `middleware.ts` com matcher (exclui `/login`, `/api/auth/*`, `/api/inngest`)
   - Criar página `/login` com formulário (shadcn/ui)
   - Criar script `pnpm db:seed` para inserir usuários iniciais

3. **Cliente DataJud** — depende do passo 1 (tipos Drizzle); independente do passo 2
   - Criar `src/lib/datajud/tribunals.ts` com lista estática dos ~90 tribunais
   - Criar `src/lib/datajud/query-builder.ts` (Elasticsearch DSL a partir de `SearchFilters`)
   - Criar `src/lib/datajud/client.ts` com retry/backoff
   - Testar manualmente contra DataJud com pelo menos um tribunal e um filtro real

4. **Inngest + função de busca federada** — depende dos passos 1 e 3
   - Instalar `inngest` + `@inngest/next`
   - Criar `src/inngest/client.ts`
   - Criar `src/app/api/inngest/route.ts`
   - Criar `src/inngest/federated-search.ts` com lógica de batch
   - Criar helpers `persistBatchResults()` e `finalizeSearch()` em `src/db/`

5. **Route Handlers de busca** — depende dos passos 1, 2 e 4
   - `POST /api/searches` (criação + cache check + trigger Inngest)
   - `GET /api/searches` (histórico paginado)
   - `GET /api/searches/[id]` (status + resultados paginados)
   - `POST /api/searches/[id]/rerun` (clonar job)

6. **Exportação CSV** — depende do passo 5
   - Criar `src/lib/export/csv.ts`
   - `GET /api/searches/[id]/export?formato=csv`

7. **Frontend — painel de busca e resultados** — depende do passo 5
   - Página `/search`: painel de filtros (shadcn/ui Form + React Hook Form + Zod)
   - Hook `useSearchStatus(id)`: polling a cada 3s, para quando status é terminal
   - Componente de lista de resultados com paginação
   - Indicador de progresso (tribunais processados / total)
   - Estados: `em_andamento`, `sem_resultados`, `com_falhas_parciais`, `erro_geral`

8. **Frontend — histórico** — depende do passo 7
   - Página `/history`: lista de buscas salvas com status e botão "Reexecutar"
   - Botão "Exportar CSV" nos resultados de buscas concluídas

### Technical Dependencies

- **Conta Neon** provisionada e `DATABASE_URL` disponível antes do passo 1.
- **Conta Inngest** provisionada e `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` disponíveis antes do passo 4.
- **Chave DataJud** (`DATAJUD_API_KEY`) configurada como variável de ambiente antes do passo 3.
- **Vercel project** criado e variáveis de ambiente configuradas antes do deploy do passo 7.

---

## Monitoring and Observability

**Métricas a acompanhar (via logs estruturados):**

| Evento | Campos obrigatórios |
|---|---|
| Busca criada | `searchId`, `userId`, `filterCount`, `cacheHit` |
| Batch iniciado | `searchId`, `batchIndex`, `tribunalCount` |
| Tribunal consultado | `searchId`, `tribunal`, `durationMs`, `resultCount`, `error?` |
| Busca finalizada | `searchId`, `status`, `totalResults`, `failedTribunals`, `totalDurationMs` |
| Rate limit atingido | `tribunal`, `retryAfterMs` |
| Cache hit | `cacheKey`, `originalSearchId` |

**Logs estruturados:** usar `console.log(JSON.stringify({ event, ...fields }))` em todas as funções Inngest. A Vercel expõe esses logs no Vercel Logs dashboard.

**Dashboard Inngest:** monitorar taxa de falha por step, duração média por batch e jobs presos em `processing` por mais de 10 minutos (indicativo de job órfão).

**Alertas manuais no MVP:** revisar diariamente os logs de `rate limit atingido` e `busca finalizada com status=failed` para detectar degradação do DataJud.

**Jobs órfãos:** job que permanece em `processing` após `MAX_JOB_DURATION` (configurável, sugerido 15 minutos) deve ser marcado como `partial` por uma query de cleanup — implementar como parte do passo 4.

---

## Technical Considerations

### Key Decisions

**Polling vs. WebSocket para progresso da busca:**
- Adotado: polling HTTP a cada 3 segundos via `GET /api/searches/[id]`.
- Justificativa: WebSockets (ou Server-Sent Events) exigem conexão persistente, incompatível com o modelo stateless de funções serverless da Vercel sem infraestrutura adicional (ex.: Pusher, Ably). Polling a 3s é suficiente para a UX de progresso do MVP.
- Trade-off: gera carga adicional de ~20 requests/minuto por usuário com busca ativa; aceitável para volume de MVP.

**Normalização de filtros para cache key:**
- O hash SHA-256 deve ser calculado sobre `JSON.stringify` dos filtros com chaves ordenadas alfabeticamente e valores de arrays ordenados — para que `{ grau: ['G1', 'G2'] }` e `{ grau: ['G2', 'G1'] }` gerem o mesmo cache key.
- Implementar `normalizeFilters(filters: SearchFilters): string` em `src/lib/datajud/query-builder.ts`.

**LGPD — campos de partes:**
- O DataJud retorna CPF/CNPJ no array de polos em alguns tribunais. O mapeamento em `client.ts` deve extrair apenas `nome` e `polo`, descartando documentos antes de qualquer persistência.
- `rawData` nunca é armazenado — somente os campos mapeados para `ProcessoResult`.

### Known Risks

- **Job órfão:** se uma invocação Inngest for cancelada abruptamente (deploy durante execução, timeout sem captura), o job pode ficar preso em `processing`. Mitigação: query de cleanup em `finalizeSearch()` + trigger periódico via Inngest cron (1x por hora) que atualiza jobs em `processing` há mais de 15 minutos para `partial`.

- **Chave DataJud rotacionada pelo CNJ:** a chave pública pode ser rotacionada a qualquer momento. Mitigação: armazenar em `DATAJUD_API_KEY` env var (não hardcoded); monitorar respostas 401 do DataJud e alertar imediatamente.

- **Variação de schema entre tribunais:** o DataJud retorna esquemas ligeiramente diferentes por tribunal (campos ausentes, nomes diferentes). Mitigação: o mapeamento em `client.ts` usa `?.` (optional chaining) em todos os campos complementares; apenas `numero` é obrigatório.

- **Tamanho de lote de 10 tribunais:** calibrado conservadoramente para o plano Hobby da Vercel (10s timeout por função). Se o plano for Pro (60s), o lote pode ser aumentado para 30+ — reduzindo o número de steps Inngest e a latência total. Expor `DATAJUD_BATCH_SIZE` como variável de ambiente para ajuste sem redeploy.

---

## Architecture Decision Records

- [ADR-001: Estratégia do MVP — Busca Nacional Assíncrona com Fluxo Completo](adrs/adr-001.md) — Busca federada assíncrona em todos os tribunais DataJud, Next.js full-stack na Vercel; scraping e monitoramento periódico adiados.
- [ADR-002: Banco de Dados e ORM — Neon + Drizzle ORM](adrs/adr-002.md) — Neon Postgres serverless-first com Drizzle ORM type-safe; sem Prisma (cold start), sem Supabase (auth redundante).
- [ADR-003: Autenticação — NextAuth.js v5 com Credentials Provider](adrs/adr-003.md) — JWT sessions stateless, e-mail/senha com bcrypt; sem Clerk (lock-in, LGPD) nem Lucia (mais código manual).
- [ADR-004: Orquestração de Jobs — Inngest](adrs/adr-004.md) — Step functions serverless com retries nativos; sem Vercel Cron (granularidade 1 min) nem self-calling handler (sem garantia de entrega).
