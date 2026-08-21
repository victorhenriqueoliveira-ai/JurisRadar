# TechSpec — Correção de Bugs Críticos e Melhorias Gerais do JurisRadar

## Executive Summary

Este TechSpec cobre oito correções e melhorias na aplicação Next.js 14 do JurisRadar, todas cirúrgicas — sem reescritas de módulos. As mudanças tocam quatro camadas: service layer (`processos.ts`, `dashboard.ts`), rotas de API (`calendario/eventos`, `djen/searches`, `processos/sync`, nova `/api/dashboard/summary`), componentes React (`Passo2Importacao`, `ProcessoTable`, `DashboardPoller` novo) e o scheduler Inngest (`sync-processos-scheduler.ts`).

O principal trade-off técnico é o filtro de urgência e `proximoPrazo` no CRM: calculados no frontend sobre os itens da página corrente (ADR-002), o que simplifica o backend mas limita o filtro a processos já carregados. O polling do dashboard usa uma nova rota `/api/dashboard/summary` com `revalidate: 15` em vez de `router.refresh()` para evitar re-render completo da página (ADR-003).

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js 14 App Router)                │
│                                                   │
│  Passo2Importacao.tsx  ──► POST /api/processos/sync (202, fire-and-forget)
│  DashboardPoller.tsx   ──► GET  /api/dashboard/summary (polling 30s)
│  ProcessoTable.tsx     ──► link externo DJEN Nacional (_blank)
│  ProcessoFilters.tsx   ──► filtro urgência aplicado no cliente
└──────────────┬──────────────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────────────┐
│  API Routes (Next.js Route Handlers)             │
│                                                   │
│  GET  /api/dashboard/summary    [NOVO]            │
│  POST /api/processos/sync       [existente]       │
│  GET  /api/processos            [fix sort/order]  │
│  POST /api/calendario/eventos   [fix erro 500]    │
│  GET  /api/djen/searches        [fix relevância]  │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  Service Layer                                    │
│  listProcessos()   [fix sort dinâmico]            │
│  aggregateDashboard() / getPrazosUrgentes()       │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  PostgreSQL (Neon) via Drizzle ORM               │
│  processos · eventosAgenda · eventosCalendario   │
│  movimentacoes · notificacoes · organizations    │
└─────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  Inngest (background jobs)                        │
│  sync-processos-scheduler: cron '0 */5 * * *'   │ ← era '0 6 * * *'
│  sync-processos-worker: processa por tribunal    │
└─────────────────────────────────────────────────┘
```

---

## Implementation Design

### Core Interfaces

**1. `listProcessos` — assinatura estendida com sort**

```typescript
// src/services/processos.ts

type SortableColumn = 'numeroCnj' | 'tribunal' | 'areaDireito'
  | 'status' | 'ultimaMovimentacao' | 'createdAt';

interface ProcessoFilters {
  status?: string;
  area?: string;
  tribunal?: string;
  responsavel_id?: string;
  q?: string;
  cursor?: string;
  limit?: number;
  sort?: SortableColumn;   // novo
  order?: 'asc' | 'desc'; // novo
}
```

**2. `DashboardSummary` — response da nova rota**

```typescript
// src/app/api/dashboard/summary/route.ts

interface DashboardSummaryResponse {
  totalAtivos: number;
  urgenciaAlta: number;
  prazos7Dias: number;
  intimacoesNaoLidas: number;
  distribuicaoStatus: { status: string; count: number }[];
  distribuicaoArea: { area: string; count: number }[];
  prazosUrgentes: { processoId: string; numeroCnj: string;
                    titulo: string; data: string; diasRestantes: number }[];
  movimentacoesRecentes: { processoId: string; numeroCnj: string;
                           tipo: string; descricao: string; dataHora: string }[];
  lastSyncAt: string | null; // ISO timestamp do último sync OAB da org
}
```

**3. `DashboardPoller` — client component de polling**

```typescript
// src/components/dashboard/DashboardPoller.tsx
'use client';

interface DashboardPollerProps {
  initialData: DashboardSummaryResponse;
  pollIntervalMs?: number; // default: 30_000
}
```

### Data Models

Nenhum schema novo. Campos relevantes dos modelos existentes:

**`processos`** — colunas sortáveis suportadas no backend:
- `numeroCnj text`, `tribunal text`, `areaDireito text`
- `status text`, `ultimaMovimentacao text`, `createdAt timestamp`

**`eventosAgenda`** — tabela alvo da rota `POST /api/calendario/eventos`:
- `id uuid PK`, `orgId uuid FK`, `titulo text NOT NULL`, `data date NOT NULL`
- `horaInicio text`, `horaFim text`, `tipo text DEFAULT 'pessoal'`

**Nota:** `proximoPrazo` não existe em `processos` — calculado no frontend (ADR-002).

### API Endpoints

#### NOVO — `GET /api/dashboard/summary`

```
GET /api/dashboard/summary?scope=pessoal|escritorio
Authorization: session cookie

200 OK
Content-Type: application/json
Cache-Control: private, no-store   (dados são tenant-específicos)
next: { revalidate: 15 }           (ISR de 15s para reduzir carga)

Body: DashboardSummaryResponse

401  → sessão inválida
403  → scope=escritorio sem role='socio'
```

#### MODIFICADO — `GET /api/processos`

Parâmetros adicionados:

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `sort` | string | `createdAt` | Coluna de ordenação (whitelist validada) |
| `order` | `asc\|desc` | `desc` | Direção da ordenação |

Parâmetro `urgencia` continua aceito pela rota mas não aplicado no backend — tratado no frontend (ADR-002).

#### MODIFICADO — `POST /api/calendario/eventos`

Erros mapeados de genérico para descritivo:

| Situação | Status | Mensagem |
|----------|--------|----------|
| título vazio | 400 | "O título do evento é obrigatório." |
| data inválida | 400 | "A data informada é inválida. Use o formato DD/MM/AAAA." |
| org não encontrada | 403 | "Sessão inválida. Faça login novamente." |
| erro de banco | 500 | "Não foi possível salvar o evento. Tente novamente." |

#### MODIFICADO — `GET /api/djen/searches`

Pós-filtragem no backend: após receber response da API PJe, filtrar `items` mantendo apenas registros onde o `texto` (campo de corpo da publicação) contenha o termo buscado (case-insensitive). Resposta retorna campo adicional:

```json
{
  "total": 3,
  "filteredByTerm": true,
  "originalTotal": 20,
  "items": [...]
}
```

---

## Integration Points

### API PJe — `comunicaapi.pje.jus.br`

- **Rota afetada:** `GET /api/djen/searches`
- **Mudança:** pós-filtragem aplicada sobre `response.items` antes de retornar ao frontend; contrato da requisição à API externa não muda.
- **Campo usado para filtragem:** `item.texto` (corpo da publicação). Se o campo for `null` em algum item, o item é excluído do resultado quando há termo de busca ativo.

### DJEN Nacional — link externo do CRM

- **URL base:** `https://djen.cnj.jus.br/pesquisa` (verificar URL exata no portal antes de implementar)
- **Parâmetro:** `?numero={numeroCNJ}` — número do processo pré-preenchido
- **Abertura:** `target="_blank" rel="noopener noreferrer"`
- **Fallback:** se a URL do portal mudar, parametrizar via `NEXT_PUBLIC_DJEN_PORTAL_URL` em `.env`.

---

## Impact Analysis

| Componente | Tipo de Impacto | Descrição e Risco | Ação Necessária |
|---|---|---|---|
| `src/services/processos.ts` | Modificado | Adicionar sort dinâmico com whitelist; risco baixo | Adicionar `sort`/`order` à query Drizzle |
| `src/app/api/processos/route.ts` | Modificado | Repassar `sort`/`order` ao service; risco mínimo | Extrair params e passar em `filters` |
| `src/app/api/calendario/eventos/route.ts` | Modificado | Substituir catch genérico por mensagens específicas; risco baixo | Refatorar try-catch + log do erro real |
| `src/app/api/djen/searches/route.ts` | Modificado | Adicionar pós-filtragem por termo; risco baixo | Filter sobre `items` antes de retornar |
| `src/app/api/dashboard/summary/route.ts` | Novo | Nova rota; sem risco de regressão | Criar arquivo, reusar services existentes |
| `src/components/onboarding/Passo2Importacao.tsx` | Modificado | Trocar chamada síncrona por fire-and-forget; risco médio | Chamar `/api/processos/sync` (202) em vez de `/api/processos/sync-djen` |
| `src/components/dashboard/DashboardPoller.tsx` | Novo | Client component de polling; sem risco de regressão | Criar arquivo |
| `src/app/(app)/dashboard/page.tsx` | Modificado | Passar `initialData` para `DashboardPoller`; risco baixo | Envolver KPIs e listas no `DashboardPoller` |
| `src/components/crm/ProcessoTable.tsx` | Modificado | Adicionar botão "Ver no DJEN"; risco mínimo | Adicionar link com `target="_blank"` |
| `src/components/crm/ProcessoFilters.tsx` | Modificado | Filtro urgência passa a atuar no cliente | Remover envio de `urgencia` ao backend; filtrar `data` pós-fetch |
| `src/inngest/sync-processos-scheduler.ts` | Modificado | Trocar cron de diário para 5h; risco baixo | Alterar string cron |
| `src/app/(app)/dashboard/loading.tsx` | Novo | Skeleton de carregamento | Criar arquivo |
| `src/app/(app)/crm/loading.tsx` | Novo | Skeleton de carregamento | Criar arquivo |
| `src/app/(app)/calendario/loading.tsx` | Novo | Skeleton de carregamento | Criar arquivo |

---

## Testing Approach

### Unit Tests

- `listProcessos()` com `sort='tribunal'` e `order='asc'` — verificar que query Drizzle usa `asc(processos.tribunal)`.
- `listProcessos()` com `sort='proximoPrazo'` (valor inválido fora da whitelist) — verificar fallback para `desc(createdAt)`.
- Pós-filtragem DJEN: dado array de `items` onde 3 de 5 contêm o termo, verificar que apenas 3 são retornados.
- `DashboardPoller`: montar com `initialData` e verificar que não dispara fetch no primeiro render.

### Integration Tests

- `POST /api/calendario/eventos` com corpo válido — verificar 201 e evento em DB.
- `POST /api/calendario/eventos` sem título — verificar 400 com mensagem descritiva (não "Erro interno").
- `GET /api/processos?sort=tribunal&order=asc` — verificar que response está ordenado por `tribunal` ASC.
- `GET /api/dashboard/summary` — verificar que retorna 200 com os campos `totalAtivos`, `urgenciaAlta`, `prazosUrgentes`.

---

## Development Sequencing

### Build Order

1. **Fix `listProcessos()` — sort dinâmico** (`src/services/processos.ts`)
   - Sem dependências externas.
   - Adicionar whitelist de colunas sortáveis, mapear para referências Drizzle, aplicar `orderBy` dinâmico.

2. **Fix rota `GET /api/processos`** (`src/app/api/processos/route.ts`)
   - Depende do passo 1.
   - Extrair `sort` e `order` de `searchParams` e repassar ao service.

3. **Fix rota `POST /api/calendario/eventos`** (`src/app/api/calendario/eventos/route.ts`)
   - Sem dependências dos passos anteriores.
   - Investigar erro real com `console.error`, mapear para mensagens descritivas.

4. **Fix pós-filtragem DJEN** (`src/app/api/djen/searches/route.ts`)
   - Sem dependências dos passos anteriores.
   - Filtrar `items` pelo campo `texto` após resposta da API PJe.

5. **Fix onboarding — fire-and-forget** (`src/components/onboarding/Passo2Importacao.tsx`)
   - Sem dependências dos passos anteriores.
   - Trocar `await fetch('/api/processos/sync-djen')` por `fetch('/api/processos/sync', { method: 'POST' })` sem await; avançar passo imediatamente após disparo.

6. **Fix filtro urgência no frontend** (`src/components/crm/ProcessoFilters.tsx` + `src/app/(app)/crm/page.tsx`)
   - Depende do passo 2 (sort correto já funcionando).
   - Remover `urgencia` dos params enviados ao backend; aplicar `filter()` client-side sobre `processos` carregados usando regra de `diasRestantes <= 5`.

7. **Botão "Ver no DJEN" no CRM** (`src/components/crm/ProcessoTable.tsx`)
   - Sem dependências dos passos anteriores.
   - Adicionar coluna/ícone com `<a href={djenUrl(numeroCnj)} target="_blank">`.

8. **Nova rota `GET /api/dashboard/summary`** (`src/app/api/dashboard/summary/route.ts`)
   - Sem dependências dos passos anteriores.
   - Reusar `aggregateDashboard()` e `getPrazosUrgentes()` de `src/services/dashboard.ts`.
   - Adicionar `lastSyncAt`: última `ultimaSyncAt` de qualquer processo da org.

9. **`DashboardPoller` client component** (`src/components/dashboard/DashboardPoller.tsx`)
   - Depende do passo 8 (rota deve existir).
   - `useEffect` com `setInterval(30_000)` + `visibilitychange`; cleanup no unmount.

10. **Integrar `DashboardPoller` no dashboard** (`src/app/(app)/dashboard/page.tsx`)
    - Depende do passo 9.
    - Buscar `initialData` no Server Component; passar como prop para `DashboardPoller`.
    - Adicionar botão "Sincronizar agora" que POST `/api/processos/sync` e exibe timestamp.

11. **Ajustar cron Inngest para 5h** (`src/inngest/sync-processos-scheduler.ts`)
    - Sem dependências dos passos anteriores.
    - Alterar `'0 6 * * *'` para `'0 */5 * * *'`.

12. **Adicionar `loading.tsx` nas rotas principais**
    - Sem dependências dos passos anteriores.
    - Criar `loading.tsx` em `/dashboard`, `/crm`, `/calendario` com skeletons.

### Technical Dependencies

- A rota `POST /api/processos/sync` deve estar funcional antes do passo 5 (onboarding) — ela já existe.
- `aggregateDashboard()` e `getPrazosUrgentes()` de `src/services/dashboard.ts` devem ser importáveis na nova rota — já existem.
- A URL exata do portal DJEN Nacional deve ser verificada antes do passo 7.

---

## Monitoring and Observability

- **Log obrigatório no calendário:** `console.error('[calendario/eventos POST]', error)` antes de retornar 500 — permite rastrear a causa raiz.
- **Log de pós-filtragem DJEN:** logar `{ originalCount, filteredCount, term }` em cada request de busca para monitorar eficácia do filtro.
- **Polling dashboard:** não logar cada tick; logar apenas erros (`console.error('[DashboardPoller]', err)`).
- **Inngest scheduler:** o Inngest já emite eventos de execução — verificar dashboard do Inngest para confirmar que o novo cron de 5h está rodando.

---

## Technical Considerations

### Known Risks

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Campo `texto` ausente ou `null` em items da API PJe | Média — estrutura da API pode variar | Tratar `null` como "não contém o termo" e excluir o item; nunca lançar exceção |
| Erro 500 do calendário causado por problema de schema (coluna faltando em `eventosAgenda`) | Baixa — schema parece completo | Verificar migrations aplicadas antes do fix; adicionar log com stack trace |
| Onboarding fire-and-forget: usuário avança mas sync falha silenciosamente | Média | Exibir notificação assíncrona via `notificacoes` quando sync concluir; fora do escopo imediato mas documentado |
| URL do portal DJEN Nacional incorreta | Baixa | Parametrizar via `NEXT_PUBLIC_DJEN_PORTAL_URL`; validar antes de subir |
| Polling de 30s com muitos usuários simultâneos sobrecarrega `/api/dashboard/summary` | Baixa | `revalidate: 15` reduz queries ao DB; monitorar p95 da rota |

---

## Architecture Decision Records

- [ADR-001: Estratégia de Atualização do Dashboard Após Sync OAB](adrs/adr-001.md) — Polling leve de 30s com aba em foco, sem SSE ou infraestrutura nova.
- [ADR-002: Cálculo de proximoPrazo e Filtro de Urgência no CRM](adrs/adr-002.md) — Urgência e proximoPrazo calculados no frontend sobre itens carregados; backend não recebe JOIN nem coluna nova.
- [ADR-003: Polling do Dashboard via Rota /api/dashboard/summary](adrs/adr-003.md) — Nova rota JSON com revalidate:15 para polling client-side em vez de router.refresh().
