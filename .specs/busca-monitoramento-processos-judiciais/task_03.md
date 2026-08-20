---
status: pending
title: Cliente DataJud — Integração com API CNJ
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 03: Cliente DataJud — Integração com API CNJ

## Overview

Implementa a camada de integração com a API pública DataJud do CNJ: lista estática dos ~90 tribunais, construtor de queries Elasticsearch DSL a partir de `SearchFilters`, cliente HTTP com retry/backoff e mapeamento da resposta DataJud para o tipo de domínio `ProcessoResult`. Esta camada é o único ponto de contato do sistema com o DataJud — todas as demais partes do sistema a consomem sem conhecer detalhes do protocolo DataJud.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `src/lib/datajud/tribunals.ts` com a lista estática das siglas dos ~90 tribunais cobertos pelo DataJud (TJs, TRFs, TRTs, STF, STJ, TST, TSE, etc.).
- DEVE criar `src/lib/datajud/types.ts` com as interfaces `SearchFilters` e `ProcessoResult` conforme especificado na seção "Core Interfaces" do TechSpec.
- DEVE criar `src/lib/datajud/query-builder.ts` com a função `buildDataJudQuery(filters: SearchFilters, from: number, size: number): object` que gera o Elasticsearch DSL correto para cada filtro suportado no MVP.
- DEVE criar `src/lib/datajud/client.ts` com a função `queryTribunal(tribunal, filters, from?, size?)` que realiza o POST ao endpoint DataJud e retorna `{ hits: ProcessoResult[], total: number }`.
- O cliente DEVE implementar retry com backoff exponencial: 3 tentativas, delays de 1s, 2s, 4s. Erro 429 → respeitar `Retry-After`. Erros 5xx → backoff. Erros 4xx (exceto 429) → não retentar.
- O mapeamento de resposta DEVE extrair apenas os campos definidos em `ProcessoResult` — sem armazenar `rawData`. Dados de CPF/documento das partes DEVEM ser descartados (minimização LGPD).
- DEVE criar `src/lib/datajud/normalize-filters.ts` com `normalizeFilters(filters: SearchFilters): string` que serializa os filtros com chaves ordenadas para geração de cache key SHA-256 consistente.
- A variável `DATAJUD_API_KEY` DEVE ser lida de `process.env` (nunca hardcoded).
- DEVE lançar erros tipados `DataJudRateLimitError` e `DataJudUnavailableError` para que o Inngest possa diferenciar e tratar cada caso.
- DEVE exportar `DATAJUD_BATCH_SIZE` como constante configurável via variável de ambiente `DATAJUD_BATCH_SIZE` (padrão: 10).
</requirements>

## Subtasks

- [ ] 3.1 Criar `src/lib/datajud/types.ts` com `SearchFilters`, `ProcessoResult` e tipos de erro
- [ ] 3.2 Criar `src/lib/datajud/tribunals.ts` com lista estática dos ~90 tribunais DataJud
- [ ] 3.3 Criar `src/lib/datajud/normalize-filters.ts` com normalização determinística de filtros e geração de hash SHA-256
- [ ] 3.4 Criar `src/lib/datajud/query-builder.ts` traduzindo `SearchFilters` para Elasticsearch DSL
- [ ] 3.5 Criar `src/lib/datajud/client.ts` com retry/backoff, mapeamento de resposta e descarte de CPF/documento das partes
- [ ] 3.6 Adicionar `DATAJUD_API_KEY` e `DATAJUD_BATCH_SIZE` ao `.env.example`
- [ ] 3.7 Testar manualmente `queryTribunal('TJSP', { assunto: ['pensão alimentícia'], grau: ['G1'] })` e verificar resultado real

## Implementation Details

Consulte as seções **"Integration Points — DataJud API"** e **"Core Interfaces"** do TechSpec para os detalhes do endpoint DataJud, estrutura do DSL, política de retry e mapeamento de campos (`dadosBasicos.*` → `ProcessoResult`).

Estrutura esperada ao final:

```
src/lib/datajud/
  types.ts              ← SearchFilters, ProcessoResult, erros tipados
  tribunals.ts          ← lista estática das siglas
  normalize-filters.ts  ← hash determinístico dos filtros
  query-builder.ts      ← Elasticsearch DSL builder
  client.ts             ← queryTribunal() com retry
```

O campo `partes` no retorno DataJud pode conter CPF/CNPJ em alguns tribunais — o mapeamento deve extrair apenas `{ polo, nome }`, ignorando documentos.

### Relevant Files

- `src/lib/datajud/types.ts` — contratos de tipo consumidos pelo Inngest e pelos Route Handlers
- `src/lib/datajud/tribunals.ts` — fonte da lista de tribunais usada pelo Inngest para iterar batches
- `src/lib/datajud/client.ts` — único ponto de chamada HTTP ao DataJud
- `.env.example` — documentar `DATAJUD_API_KEY` e `DATAJUD_BATCH_SIZE`

### Dependent Files

- `src/inngest/federated-search.ts` (task_04) — importa `queryTribunal`, `DATAJUD_TRIBUNALS` e `DATAJUD_BATCH_SIZE`
- `src/app/api/searches/route.ts` (task_05) — importa `normalizeFilters` para geração da cache key
- `src/db/schema.ts` (task_01) — `SearchFilters` é o tipo do campo JSONB `filters` em `searches`

### Related ADRs

- [ADR-001: Estratégia do MVP — Busca Nacional Assíncrona](adrs/adr-001.md) — define que DataJud é a única fonte de dados no MVP e que o processamento é feito em batches

## Deliverables

- `src/lib/datajud/types.ts` com `SearchFilters`, `ProcessoResult` e erros tipados
- `src/lib/datajud/tribunals.ts` com lista completa dos tribunais DataJud
- `src/lib/datajud/normalize-filters.ts` com hash SHA-256 determinístico
- `src/lib/datajud/query-builder.ts` cobrindo todos os filtros do MVP
- `src/lib/datajud/client.ts` com retry/backoff e mapeamento LGPD-compliant
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração contra DataJud real **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `buildDataJudQuery` com `assunto: ['pensão alimentícia']` gera `match` no campo correto do DSL
  - [ ] `buildDataJudQuery` com `grau: ['G1']` gera `term` no campo `dadosBasicos.grau`
  - [ ] `buildDataJudQuery` com `dataDistribuicaoInicio` e `dataDistribuicaoFim` gera `range` correto
  - [ ] `buildDataJudQuery` com `SearchFilters` vazio (sem nenhum campo) retorna query `match_all`
  - [ ] `normalizeFilters({ grau: ['G2', 'G1'] })` e `normalizeFilters({ grau: ['G1', 'G2'] })` produzem o mesmo hash SHA-256
  - [ ] `normalizeFilters` com filtros diferentes produz hashes diferentes
  - [ ] Mapeamento de resposta DataJud descarta campos de documento (CPF/CNPJ) das partes
  - [ ] Mapeamento de resposta DataJud retorna `ProcessoResult` com `numero` preenchido mesmo quando campos opcionais estão ausentes
  - [ ] Cliente com resposta 429 e `Retry-After: 2` aguarda ≥2s antes de retentar
  - [ ] Cliente com resposta 503 retenta 3x com backoff exponencial e lança `DataJudUnavailableError`
  - [ ] Cliente com resposta 400 não retenta e relança o erro imediatamente
- Testes de integração:
  - [ ] `queryTribunal('TJSP', { grau: ['G1'] }, 0, 5)` retorna array de `ProcessoResult` com `numero` no formato CNJ (número de 20 dígitos)
  - [ ] `queryTribunal` com tribunal inválido ('INVALIDO') lança `DataJudUnavailableError` após retries
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `queryTribunal('TJSP', { assunto: ['pensão alimentícia'], grau: ['G1'] })` retorna ao menos um `ProcessoResult` com `numero` válido em ambiente real
- Nenhum dado de CPF/documento aparece nos objetos `ProcessoResult` retornados
- Hash de filtros é idêntico independente da ordem das chaves ou valores de array
