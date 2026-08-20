# TechSpec — JurisRadar: Busca de Publicações no DJE/TJSP

## Executive Summary

A feature adiciona uma segunda fonte de dados ao JurisRadar: o Diário da Justiça Eletrônico do TJSP (Cadernos 2 e 3), indexado diariamente via job Inngest com trigger cron. O índice é armazenado em Postgres (Neon) com busca full-text via `tsvector` e dicionário `'portuguese'`, entregando stemming morfológico sem dependência de serviço externo. A busca é síncrona — resultados retornam diretamente da query, sem polling.

O principal trade-off da abordagem: ao não persisitir snapshot de resultados (ADR-004), a exportação CSV e a reexecução sempre re-executam a query ao vivo sobre o índice local. Isso simplifica o schema e elimina duplicação de dados, mas significa que um reprocessamento retroativo do índice altera histórico de resultados — comportamento documentado e aceito para o MVP.

Nenhum componente existente é modificado. A feature é aditiva: novos módulos `src/lib/dje/`, `src/db/dje.ts`, `src/inngest/dje-indexer.ts` e rotas sob `src/app/api/dje/`.

---

## System Architecture

### Component Overview

```
[Inngest Cron — 23h UTC / seg-sex]
        │
        ▼
[dje-indexer.ts] ──download──► [TJSP DJE Portal]
        │                       (dje.tjsp.jus.br)
        │◄──── PDF buffer ──────┘
        │
        ├─ step: download-caderno-2
        ├─ step: index-caderno-2  ──► [dje/parser.ts] ──► [Postgres: dje_publications]
        ├─ step: download-caderno-3
        └─ step: index-caderno-3  ──► [dje/parser.ts] ──► [Postgres: dje_publications]

[Usuário]
   │
   ▼
[/dje/] (page.tsx)
   │
   ├─ POST /api/dje/searches ──► [db/dje.ts: search] ──► [Postgres: dje_publications + dje_searches]
   ├─ GET  /api/dje/searches ──► [db/dje.ts: listSearches] ──► [Postgres: dje_searches]
   ├─ GET  /api/dje/searches/[id] ──► re-query ao vivo
   └─ GET  /api/dje/searches/[id]/export ──► CSV stream (re-query sem paginação)
```

**Fluxo de dados do job:**
1. Cron dispara às 23h UTC (20h BRT) de segunda a sexta
2. `dje-indexer.ts` verifica se a edição do dia já foi indexada (`dje_editions`) — idempotente
3. Baixa o PDF do caderno via fetch sem autenticação
4. `parser.ts` extrai texto bruto com `pdf-parse`, segmenta em publicações por regex CNJ, extrai vara/câmara da linha seguinte ao número
5. Insere publicações em `dje_publications` em batch; o Postgres computa `search_vector` automaticamente via coluna gerada
6. Atualiza `dje_editions` com status `completed` e `publication_count`

**Fluxo de busca do usuário:**
1. Usuário submete term + dateFrom + dateTo via `POST /api/dje/searches`
2. Route handler valida com Zod, executa query tsvector + filtro de data
3. Persiste params em `dje_searches` com `total_results`
4. Retorna page 1 dos resultados + total + search ID
5. Paginação: GET `/api/dje/searches/[id]?page=2` re-executa query com offset

---

## Implementation Design

### Core Interfaces

```typescript
// src/lib/dje/types.ts

export interface DjePublication {
  processNumber: string;       // formato CNJ: 0000000-00.0000.0.00.0000
  instance: '1' | '2';        // derivado do caderno (3 → '1', 2 → '2')
  court: string | null;        // vara ou câmara extraída do texto
  publicationDate: string;     // ISO 8601: "2026-08-07"
  caderno: 2 | 3;
  content: string;             // texto bruto da publicação
}

export interface DjeEditionStatus {
  editionDate: string;
  caderno: 2 | 3;
  status: 'pending' | 'downloading' | 'parsing' | 'completed' | 'failed';
  publicationCount: number | null;
  errorMessage: string | null;
}

export interface DjeSearchParams {
  term: string;
  dateFrom: string;   // "YYYY-MM-DD"
  dateTo: string;     // "YYYY-MM-DD"
}

export interface DjeSearchResult {
  id: string;
  processNumber: string;
  instance: '1' | '2';
  court: string | null;
  publicationDate: string;
  caderno: 2 | 3;
  snippet: string;    // ts_headline output com <mark>...</mark>
}

export interface DjeSearchResponse {
  searchId: string;
  results: DjeSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}
```

**Parser — segmentação de publicações:**

```typescript
// src/lib/dje/parser.ts  (trecho central)

const CNJ_REGEX = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;

export function segmentPublications(
  text: string,
  caderno: 2 | 3,
  publicationDate: string,
): DjePublication[] {
  const matches = [...text.matchAll(CNJ_REGEX)];
  return matches.map((match, i) => {
    const start = match.index!;
    const end = matches[i + 1]?.index ?? text.length;
    const block = text.slice(start, end).trim();
    return {
      processNumber: match[0],
      instance: caderno === 3 ? '1' : '2',
      court: extractCourt(block),
      publicationDate,
      caderno,
      content: block,
    };
  });
}
```

### Data Models

**Novas tabelas — `src/db/schema.ts` (adições):**

```typescript
export const djeEditions = pgTable('dje_editions', {
  id: uuid('id').primaryKey().defaultRandom(),
  editionDate: date('edition_date').notNull(),
  caderno: integer('caderno').notNull(),  // 2 ou 3
  status: text('status')
    .$type<'pending' | 'downloading' | 'parsing' | 'completed' | 'failed'>()
    .notNull()
    .default('pending'),
  publicationCount: integer('publication_count'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqueEditionCaderno: unique().on(t.editionDate, t.caderno),
}));

export const djePublications = pgTable('dje_publications', {
  id: uuid('id').primaryKey().defaultRandom(),
  editionId: uuid('edition_id').notNull().references(() => djeEditions.id),
  processNumber: text('process_number').notNull(),
  instance: text('instance').$type<'1' | '2'>().notNull(),
  court: text('court'),
  publicationDate: date('publication_date').notNull(),
  caderno: integer('caderno').notNull(),
  content: text('content').notNull(),
  // search_vector: coluna tsvector adicionada via SQL migration raw (Drizzle não suporta GENERATED nativamente)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  publicationDateIdx: index('dje_pub_date_idx').on(t.publicationDate),
  processNumberIdx: index('dje_pub_process_number_idx').on(t.processNumber),
  editionIdIdx: index('dje_pub_edition_id_idx').on(t.editionId),
}));

export const djeSearches = pgTable('dje_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name'),
  term: text('term').notNull(),
  dateFrom: date('date_from').notNull(),
  dateTo: date('date_to').notNull(),
  totalResults: integer('total_results').notNull().default(0),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index('dje_searches_user_id_idx').on(t.userId, t.createdAt),
}));
```

**Migration SQL adicional (raw — após migration Drizzle gerada):**

```sql
-- Coluna gerada + índice GIN para tsvector
ALTER TABLE dje_publications
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED;

CREATE INDEX dje_pub_search_vector_idx
  ON dje_publications USING GIN(search_vector);
```

**Zod schemas — `src/app/api/dje/searches/schema.ts`:**

```typescript
export const DjeSearchSchema = z.object({
  term: z.string().min(2).max(200),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).refine(
  (d) => new Date(d.dateTo) >= new Date(d.dateFrom),
  { message: 'dateTo deve ser maior ou igual a dateFrom' }
);
```

### API Endpoints

**Recurso: DJE Searches**

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `POST` | `/api/dje/searches` | Executa busca, persiste params, retorna page 1 |
| `GET` | `/api/dje/searches` | Lista histórico de buscas DJE do usuário |
| `GET` | `/api/dje/searches/[id]` | Re-executa busca com paginação |
| `POST` | `/api/dje/searches/[id]/rerun` | Cria nova busca com mesmos filtros |
| `GET` | `/api/dje/searches/[id]/export` | Exporta CSV (re-query sem paginação) |

**POST `/api/dje/searches`**
```
Request:  { term, dateFrom, dateTo, name? }
Response 201: { searchId, results: DjeSearchResult[], total, page: 1, totalPages }
Response 422: { error: string }  // validação
```

**GET `/api/dje/searches`**
```
Query:    ?page=1&limit=20
Response: { searches: DjeSearch[], total }
```

**GET `/api/dje/searches/[id]`**
```
Query:    ?page=2&limit=50
Response: { search: DjeSearch, results: DjeSearchResult[], total, page, totalPages }
Response 404: search não encontrado ou não pertence ao usuário
```

**GET `/api/dje/searches/[id]/export`**
```
Response 200: text/csv stream
Headers: Content-Disposition: attachment; filename="dje-{id}.csv"
Colunas: numero_cnj, instancia, vara_camara, data_publicacao, caderno, texto_completo
```

**Recurso: DJE Editions (operacional — sem autenticação de usuário, uso interno)**

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/dje/editions` | Status das indexações recentes (admin) |

---

## Integration Points

### TJSP DJE Portal

- **URL de download**: `https://dje.tjsp.jus.br/cdje/downloadCaderno.do?cdVolume=5&cdCaderno={2|3}&dtDiario={DD/MM/YYYY}`
  - **Atenção**: o padrão exato da URL deve ser validado empiricamente contra um caderno real antes da implementação — o portal do TJSP não tem documentação de API pública
- **Autenticação**: nenhuma — download público sem cookie ou header especial
- **Janela de disponibilidade**: 20h–8h BRT em dias úteis; 24h em fins de semana e feriados
- **Formato**: PDF textual (não scaneado), compatível com pdf-parse
- **Rate limit**: não documentado — implementar delay entre tentativas e retry com backoff exponencial (3 tentativas, delays: 5s, 15s, 45s)
- **Tratamento de erro**: HTTP 404 ou 503 → registrar falha em `dje_editions.error_message`, não lançar exceção que interrompa os outros steps do job

### Inngest

- **Trigger**: `{ cron: '0 23 * * 1-5' }` (23h UTC = 20h BRT, segunda a sexta)
- **Function ID**: `dje-daily-indexer`
- **Retries**: `retries: 2` no nível da função (padrão do projeto: 0, mas o job diário merece retry por ser crítico)
- **Idempotência**: antes de baixar, verificar `dje_editions` pelo par `(edition_date, caderno)` — se status for `completed`, pular o step

---

## Impact Analysis

| Componente | Tipo de Impacto | Descrição e Risco | Ação Necessária |
|-----------|-----------------|-------------------|-----------------|
| `src/db/schema.ts` | Modificado | Adição de 3 tabelas novas | Migration Drizzle + SQL raw para tsvector |
| `src/inngest/client.ts` | Nenhum | Reaproveitado sem alteração | — |
| `src/app/api/inngest/route.ts` | Modificado | Registrar `djeIndexer` no array de functions do serve handler | Adicionar import |
| `src/middleware.ts` | Nenhum | `/api/dje/*` fica protegido pelo middleware existente automaticamente | — |
| Menu de navegação (layout) | Modificado | Adicionar item "Publicações DJE" na sidebar | Editar `src/app/(protected)/layout.tsx` |
| `package.json` | Modificado | Adicionar `pdf-parse` e `@types/pdf-parse` | `pnpm add pdf-parse` |
| Banco de dados (Neon) | Modificado | 3 novas tabelas; GIN index pode aumentar uso de disco | Monitorar tamanho após 30 dias |

---

## Testing Approach

### Unit Tests

**`src/lib/dje/parser.test.ts`**
- `segmentPublications`: dado texto com N números CNJ, retorna N publicações
- `segmentPublications`: bloco sem número CNJ retorna array vazio
- `segmentPublications`: caderno 2 → instance '2'; caderno 3 → instance '1'
- `extractCourt`: identifica "15ª Vara Cível Central da Capital" e "8ª Câmara de Direito Privado"
- `extractCourt`: retorna null quando nenhuma vara/câmara identificável
- Usar fixture de texto real de caderno DJE (arquivo `.txt` em `__fixtures__/`)

**`src/lib/dje/client.test.ts`**
- `downloadCaderno`: mockar fetch, verificar URL montada corretamente para cada caderno/data
- `downloadCaderno`: HTTP 404 → lança `DjeUnavailableError`
- `downloadCaderno`: retry em 503 com backoff

**`src/db/dje.test.ts`**
- `searchPublications`: retorna resultados ordenados por data DESC
- `searchPublications`: filtro de período funciona (não retorna fora do range)
- Usar banco de teste Neon em ambiente CI ou mock Drizzle

### Integration Tests

- Job `dje-daily-indexer` completo: mockar fetch do PDF, fixture de PDF real, verificar inserção correta em `dje_publications` e `dje_editions`
- `POST /api/dje/searches`: session autenticada, term válido → 201 com results
- `GET /api/dje/searches/[id]/export`: retorna stream CSV com headers corretos

---

## Development Sequencing

### Build Order

1. **Migration de banco** — `src/db/migrations/` (Drizzle generate + SQL raw para tsvector): sem dependências; bloqueia todos os passos seguintes
2. **`src/lib/dje/types.ts`** — interfaces TypeScript: sem dependências; depende de nenhum passo anterior
3. **`src/lib/dje/client.ts`** — download de PDF: depende do passo 2 (tipos)
4. **`src/lib/dje/parser.ts`** — extração e segmentação: depende dos passos 2 e 3 (tipos + client); adicionar `pdf-parse` ao package.json neste passo
5. **`src/db/dje.ts`** — queries Drizzle (insert publicações, search tsvector, list searches): depende do passo 1 (migration) e 2 (tipos)
6. **`src/inngest/dje-indexer.ts`** — cron job: depende dos passos 3, 4 e 5 (client + parser + db)
7. **Registrar `djeIndexer` em `src/app/api/inngest/route.ts`**: depende do passo 6
8. **`src/app/api/dje/searches/route.ts`** (POST + GET list): depende dos passos 1 e 5
9. **`src/app/api/dje/searches/[id]/route.ts`** (GET paginado + POST rerun): depende do passo 8
10. **`src/app/api/dje/searches/[id]/export/route.ts`** (CSV): depende do passo 9; reusar padrão de `src/lib/export/csv.ts`
11. **Frontend — `src/app/(protected)/dje/page.tsx`** (formulário + lista de resultados): depende dos passos 8 e 9
12. **Frontend — `src/app/(protected)/dje/history/page.tsx`** (histórico): depende do passo 11
13. **Adicionar item "Publicações DJE" no menu de navegação**: depende do passo 11

### Technical Dependencies

- **`pdf-parse` disponível no ambiente Vercel**: validar que o bundle final não excede o limite de 50MB da Vercel com a adição da biblioteca
- **Dicionário `'portuguese'` disponível no Neon Postgres**: confirmar na primeira migration com `SELECT cfgname FROM pg_ts_config WHERE cfgname = 'portuguese'`
- **URL de download do DJE validada empiricamente**: testar manualmente `https://dje.tjsp.jus.br/cdje/downloadCaderno.do` com uma data real antes de implementar o client — a URL pode ter parâmetros adicionais não documentados
- **Inngest em produção configurado para cron**: verificar se o plano Inngest atual suporta triggers cron (Inngest Free tier tem suporte a cron)

---

## Monitoring and Observability

**Métricas do job de indexação:**
- `dje_editions.status` por data — painel operacional via query direta
- `dje_editions.publication_count` — alerta se cair abaixo de threshold (ex.: < 100 publicações por caderno indica erro de parsing)
- `dje_editions.error_message` — alerta imediato se não nulo após execução

**Métricas de busca:**
- Tempo de resposta do endpoint `POST /api/dje/searches` — meta: < 5 segundos
- `dje_searches.total_results` — distribuição de resultados por busca

**Logs estruturados obrigatórios no job:**
```typescript
console.log('[dje-indexer] download started', { date, caderno });
console.log('[dje-indexer] download completed', { date, caderno, sizeBytes });
console.log('[dje-indexer] parse completed', { date, caderno, publicationCount });
console.error('[dje-indexer] step failed', { date, caderno, error: err.message });
```

---

## Technical Considerations

### Known Risks

**Risco 1 — URL de download do TJSP não documentada**
A URL `dje.tjsp.jus.br/cdje/downloadCaderno.do` foi inferida da estrutura do portal, não de documentação oficial. O TJSP pode usar parâmetros adicionais, sessão de browser ou redirect antes do download.
*Mitigação*: validar manualmente com curl/fetch antes de implementar; se a URL não funcionar, investigar o formulário de download em `https://www.tjsp.jus.br/Sistemas_DJE` para identificar o payload correto.

**Risco 2 — Segmentação de publicações por regex CNJ**
O regex CNJ assume que cada publicação começa com o número do processo. Publicações de despachos coletivos (múltiplos processos em um único ato) ou atos sem número de processo (ex.: comunicados gerais no caderno) podem gerar segmentação incorreta.
*Mitigação*: inspecionar manualmente 3-5 cadernos reais antes de finalizar o parser; ajustar regex ou lógica de segmentação conforme o padrão real do TJSP.

**Risco 3 — Volume de dados acima do esperado**
Sem dados reais de tamanho dos cadernos 2 e 3, o crescimento do banco de dados é incerto. PDFs do DJE podem ser grandes e conter muitas publicações.
*Mitigação*: baixar e medir manualmente um caderno antes do lançamento; calcular projeção de crescimento mensal; definir política de retenção (sugestão: 24 meses) antes de ir a produção.

**Risco 4 — Step Inngest excedendo timeout da Vercel para PDFs grandes**
O step de parsing processa o PDF inteiro em memória. Se o PDF for grande (> 100MB, o que seria incomum mas possível), o step pode exceder o limite de memória ou tempo da Vercel.
*Mitigação*: medir tamanho real do PDF antes; se necessário, dividir o step de parsing em sub-batches por página.

---

## Architecture Decision Records

- [ADR-001: Estratégia de Indexação — Batch Diário com Histórico Persistido](adrs/adr-001.md) — Job cron diário baixa e indexa cadernos DJE; busca opera sobre histórico acumulado no banco
- [ADR-002: Mecanismo de Busca Full-Text — tsvector com Dicionário Português](adrs/adr-002.md) — `tsvector` com dicionário `'portuguese'` e índice GIN para stemming morfológico e snippets via `ts_headline`
- [ADR-003: Biblioteca de Extração de PDF — pdf-parse](adrs/adr-003.md) — `pdf-parse` para extração de texto; leve, zero binários nativos, compatível com Vercel serverless
- [ADR-004: Estratégia de Resultados de Busca DJE — Requery ao Vivo sem Snapshot](adrs/adr-004.md) — Apenas parâmetros de busca são persistidos; resultados são sempre rederivados ao vivo do índice local
