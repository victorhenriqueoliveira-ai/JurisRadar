---
status: pending
title: API de Buscas — Route Handlers CRUD
type: backend
complexity: high
dependencies:
  - task_01
  - task_02
  - task_04
---

# Task 05: API de Buscas — Route Handlers CRUD

## Overview

Implementa os 5 Route Handlers da API de buscas: criação de job com verificação de cache, listagem do histórico por usuário, leitura de status e resultados paginados, reexecução de busca salva e exposição do endpoint de exportação (stub que será completado na task_06). Esta tarefa é o contrato da API que o frontend e o Inngest consomem — todos os endpoints requerem sessão autenticada.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE implementar `POST /api/searches` com: (1) validação de filtros (ao menos um campo preenchido), (2) geração de `cacheKey` via `normalizeFilters`, (3) lookup de cache em `search_cache` dentro do TTL (1h), (4) se cache hit retornar `{ id, status: 'completed', cached: true }` sem disparar Inngest, (5) se cache miss criar registro em `searches` + disparar `inngest.send` + inserir em `search_cache`.
- DEVE implementar `GET /api/searches` retornando histórico paginado (`page`, `limit`) do usuário autenticado, ordenado por `created_at DESC`. Não expõe buscas de outros usuários.
- DEVE implementar `GET /api/searches/[id]` retornando `{ search: SearchJob, results: ProcessoResult[], total }` com resultados paginados (`page`, `limit`). Retorna 403 se o `userId` da busca não corresponder ao usuário da sessão.
- DEVE implementar `POST /api/searches/[id]/rerun` que cria um novo registro em `searches` com os mesmos `filters` da busca original e dispara novo evento Inngest. Retorna 404 se a busca não existir, 403 se pertencer a outro usuário.
- DEVE implementar `GET /api/searches/[id]/export` retornando 501 (stub — implementação completa na task_06).
- Todos os endpoints DEVEM extrair o `userId` da sessão via `auth()` do NextAuth.js v5 e retornar 401 se não autenticado.
- DEVE usar Zod para validação do body de `POST /api/searches` (schema `SearchFiltersSchema`).
- DEVE retornar respostas no formato JSON consistente com os contratos definidos na seção "API Endpoints" do TechSpec.
</requirements>

## Subtasks

- [ ] 5.1 Criar `src/lib/validations.ts` com `SearchFiltersSchema` em Zod
- [ ] 5.2 Implementar `POST /api/searches` com verificação de cache e trigger Inngest
- [ ] 5.3 Implementar `GET /api/searches` com paginação e isolamento por usuário
- [ ] 5.4 Implementar `GET /api/searches/[id]` com resultados paginados e verificação de propriedade
- [ ] 5.5 Implementar `POST /api/searches/[id]/rerun` clonando filtros e disparando novo job
- [ ] 5.6 Implementar `GET /api/searches/[id]/export` como stub 501

## Implementation Details

Consulte a seção **"API Endpoints"** do TechSpec para o contrato completo de cada rota (método, request, response, códigos de erro).

Consulte a seção **"Implementation Design — Lógica de cache em POST /api/searches"** do TechSpec para o algoritmo de cache (normalização → lookup → hit/miss → ação).

Estrutura esperada:

```
src/app/api/searches/
  route.ts                 ← POST (criar) + GET (listar)
  [id]/
    route.ts               ← GET (status + resultados)
    rerun/
      route.ts             ← POST (reexecutar)
    export/
      route.ts             ← GET (stub 501 → task_06)
src/lib/
  validations.ts           ← SearchFiltersSchema (Zod)
```

### Relevant Files

- `src/app/api/searches/route.ts` — endpoints de criação e listagem
- `src/app/api/searches/[id]/route.ts` — leitura de status e resultados paginados
- `src/app/api/searches/[id]/rerun/route.ts` — reexecução
- `src/lib/validations.ts` — schema Zod de validação de filtros
- `src/db/searches.ts` (task_04) — helpers de banco reutilizados aqui

### Dependent Files

- `src/app/(protected)/search/page.tsx` (task_07) — consome `POST /api/searches` e `GET /api/searches/[id]`
- `src/app/(protected)/history/page.tsx` (task_08) — consome `GET /api/searches` e `POST /api/searches/[id]/rerun`
- `src/app/api/searches/[id]/export/route.ts` (task_06) — substitui o stub 501 pela implementação real

### Related ADRs

- [ADR-003: Autenticação — NextAuth.js v5](adrs/adr-003.md) — define como obter `userId` da sessão via `auth()`

## Deliverables

- 5 Route Handlers implementados conforme contrato do TechSpec
- `SearchFiltersSchema` Zod em `src/lib/validations.ts`
- Lógica de cache completa em `POST /api/searches`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para cada endpoint **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `SearchFiltersSchema.parse({})` lança `ZodError` (nenhum filtro preenchido)
  - [ ] `SearchFiltersSchema.parse({ buscaLivre: 'alimentos' })` retorna objeto válido
  - [ ] `SearchFiltersSchema.parse({ grau: ['INVALIDO'] })` lança `ZodError`
- Testes de integração:
  - [ ] `POST /api/searches` com filtros válidos: retorna 201 com `id` e `status: 'pending'`; registro criado em `searches`; evento Inngest disparado
  - [ ] `POST /api/searches` com filtros idênticos dentro de 1h: retorna `cached: true` sem criar novo registro
  - [ ] `POST /api/searches` com body vazio: retorna 422
  - [ ] `POST /api/searches` sem sessão: retorna 401
  - [ ] `GET /api/searches` retorna apenas buscas do usuário autenticado (não expõe buscas de outro usuário)
  - [ ] `GET /api/searches/[id]` de busca de outro usuário retorna 403
  - [ ] `GET /api/searches/[id]` de busca inexistente retorna 404
  - [ ] `GET /api/searches/[id]?page=2&limit=10` retorna a segunda página de resultados
  - [ ] `POST /api/searches/[id]/rerun` cria novo registro com mesmos `filters` e retorna 201 com novo `id`
  - [ ] `POST /api/searches/[id]/rerun` em busca de outro usuário retorna 403
  - [ ] `GET /api/searches/[id]/export` retorna 501
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Dois usuários distintos nunca veem buscas um do outro via qualquer endpoint
- Cache corretamente retorna `cached: true` para filtros idênticos dentro do TTL
- Inngest recebe evento `search/created` imediatamente após `POST /api/searches` bem-sucedido
