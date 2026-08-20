---
status: pending
title: Inngest — Orquestração da Busca Federada
type: backend
complexity: high
dependencies:
  - task_01
  - task_03
---

# Task 04: Inngest — Orquestração da Busca Federada

## Overview

Implementa a função Inngest `federated-search` que recebe o evento `search/created`, processa os ~90 tribunais em batches de N por `step.run()`, persiste progresso e resultados no banco entre invocações e finaliza o job com status `completed` ou `partial`. Também implementa a rota webhook `/api/inngest`, o mecanismo de cleanup de jobs órfãos e os helpers de banco usados pela função.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE instalar `inngest` e `@inngest/next`.
- DEVE criar `src/inngest/client.ts` com a instância Inngest configurada com `INNGEST_EVENT_KEY`.
- DEVE criar a rota webhook em `src/app/api/inngest/route.ts` exportando o handler Inngest (pública, excluída do middleware de auth da task_02).
- DEVE criar `src/inngest/federated-search.ts` com a função `federated-search` que processa os tribunais em batches de `DATAJUD_BATCH_SIZE` por `step.run()`.
- Cada `step.run()` DEVE processar os N tribunais do batch com `Promise.allSettled()` — tribunais com falha são registrados em `failedTribunals` sem abortar o job.
- DEVE criar helpers em `src/db/searches.ts`: `persistBatchResults(searchId, batch, settled)`, `finalizeSearch(searchId)` e `markSearchProcessing(searchId)`.
- `persistBatchResults` DEVE atualizar `searches.processedTribunals`, `searches.failedTribunals`, `searches.totalResults` e inserir os resultados em `search_results` em uma única transação por batch.
- `finalizeSearch` DEVE marcar a busca como `completed` se `failedTribunals` for vazio, ou `partial` se houver falhas.
- DEVE implementar cleanup de jobs órfãos: busca em `processing` há mais de 15 minutos é marcada como `partial` — implementado como `step.run('cleanup-stale')` no início da função ou via Inngest cron separado.
- DEVE configurar retry por step no Inngest (`retries: 2`) para tentar novamente steps com falha transitória.
- Variáveis `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY` DEVEM ser adicionadas ao `.env.example`.
- NÃO DEVE processar `rawData` do DataJud além do necessário para extrair os campos de `ProcessoResult` — os helpers de banco recebem `ProcessoResult[]`, não payloads brutos do DataJud.
</requirements>

## Subtasks

- [ ] 4.1 Instalar `inngest` e `@inngest/next`; criar `src/inngest/client.ts`
- [ ] 4.2 Criar rota `src/app/api/inngest/route.ts` (webhook público)
- [ ] 4.3 Criar `src/db/searches.ts` com helpers `persistBatchResults`, `finalizeSearch`, `markSearchProcessing`
- [ ] 4.4 Criar `src/inngest/federated-search.ts` com a função principal e lógica de batches
- [ ] 4.5 Implementar tratamento de jobs órfãos (busca em `processing` > 15 min → `partial`)
- [ ] 4.6 Adicionar `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY` ao `.env.example`
- [ ] 4.7 Validar no dashboard Inngest que uma busca de teste percorre todos os steps sem erro

## Implementation Details

Consulte a seção **"Integration Points — Inngest"** do TechSpec para a estrutura da função, o padrão de evento `search/created` e a configuração de retries por step.

A estrutura esperada ao final desta tarefa:

```
src/
  inngest/
    client.ts                ← instância Inngest
    federated-search.ts      ← função principal com steps
  db/
    searches.ts              ← helpers persistBatchResults, finalizeSearch
  app/api/inngest/
    route.ts                 ← webhook handler (público)
```

O `processedTribunals` deve ser um append atômico por batch — usar `arrayAppend` do Drizzle ou atualização com `||` no Postgres para evitar race condition se dois steps tentarem atualizar simultaneamente (improvável com Inngest serial, mas defensivo).

### Relevant Files

- `src/inngest/client.ts` — instância compartilhada do Inngest
- `src/inngest/federated-search.ts` — lógica central da busca federada
- `src/db/searches.ts` — helpers de persistência de progresso e resultados
- `src/app/api/inngest/route.ts` — ponto de entrada de eventos Inngest

### Dependent Files

- `src/app/api/searches/route.ts` (task_05) — dispara `inngest.send({ name: 'search/created', data: { searchId, filters } })`
- `src/app/api/searches/[id]/route.ts` (task_05) — lê `searches.status` e `searches.processedTribunals` para expor progresso ao frontend

### Related ADRs

- [ADR-004: Orquestração de Jobs — Inngest](adrs/adr-004.md) — justifica Inngest vs. Vercel Cron e self-calling handler; define o modelo de batch com `step.run()`
- [ADR-001: Estratégia do MVP — Busca Nacional Assíncrona](adrs/adr-001.md) — define a necessidade de distribuir o processamento em múltiplas invocações

## Deliverables

- `src/inngest/client.ts` e `src/inngest/federated-search.ts` funcionais
- Rota `/api/inngest` configurada e validada no dashboard Inngest
- Helpers `persistBatchResults` e `finalizeSearch` em `src/db/searches.ts`
- Lógica de cleanup de jobs órfãos implementada
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração do fluxo completo de um job **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `persistBatchResults` com 2 tribunais bem-sucedidos e 1 com falha: insere 2 resultados em `search_results`, adiciona 2 em `processedTribunals` e 1 em `failedTribunals`, incrementa `totalResults` por 2
  - [ ] `persistBatchResults` com todos os tribunais falhando: não insere em `search_results`, adiciona todos em `failedTribunals`
  - [ ] `finalizeSearch` quando `failedTribunals` é vazio: define `status = 'completed'` e `completedAt`
  - [ ] `finalizeSearch` quando `failedTribunals` tem ao menos 1 entrada: define `status = 'partial'`
  - [ ] Cleanup: busca com `status = 'processing'` e `startedAt` há 16 min é marcada como `partial`
  - [ ] Cleanup: busca com `status = 'processing'` e `startedAt` há 14 min não é alterada
- Testes de integração:
  - [ ] Evento `search/created` com `searchId` válido percorre todos os steps e a busca termina com `status` em `completed` ou `partial` (nunca em `processing`)
  - [ ] Evento `search/created` com `searchId` inexistente falha no primeiro step sem travar o job em estado indefinido
  - [ ] Após conclusão do job, `search_results` contém ao menos um resultado com `numero` não-nulo para uma busca com filtro real
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Uma busca real de teste no dashboard Inngest mostra todos os steps executados sem timeout de função
- O banco reflete `status = 'completed'` ou `'partial'` após a conclusão (nunca `'processing'` estagnado)
- Nenhum `rawData` do DataJud é persistido em `search_results`
