---
status: completed
title: API Routes de busca DJE
type: backend
complexity: high
dependencies:
  - task_01
  - task_04
---

# Task 06: API Routes de busca DJE

## Overview

Implementa os 5 route handlers da feature DJE sob `src/app/api/dje/searches/`: criação de busca (síncrona), listagem do histórico, paginação de resultados, reexecução e exportação CSV. Segue os mesmos padrões de autenticação, validação Zod e resposta que as rotas DataJud existentes.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `src/app/api/dje/searches/schema.ts` com o schema Zod `DjeSearchSchema` descrito na seção "Data Models" do TechSpec
- `POST /api/dje/searches` DEVE executar a busca de forma síncrona (sem Inngest), persistir params em `dje_searches` com `total_results` e retornar page 1 dos resultados com o `searchId`; resposta 201
- `GET /api/dje/searches` DEVE retornar histórico do usuário autenticado paginado por `?page` e `?limit`; resposta 200
- `GET /api/dje/searches/[id]` DEVE re-executar a query ao vivo com os params da busca salva, suportando `?page` e `?limit`; DEVE retornar 404 se a busca não pertencer ao usuário autenticado
- `POST /api/dje/searches/[id]/rerun` DEVE criar nova entrada em `dje_searches` com os mesmos `term`, `dateFrom` e `dateTo` da busca original e retornar 201 com o novo `searchId`
- `GET /api/dje/searches/[id]/export` DEVE re-executar a query sem paginação e retornar stream CSV com `Content-Disposition: attachment; filename="dje-{id}.csv"`; colunas: `numero_cnj`, `instancia`, `vara_camara`, `data_publicacao`, `caderno`, `texto_completo`
- Todos os endpoints DEVEM retornar 401 para requisições sem sessão válida, seguindo o padrão do middleware existente
- O schema Zod DEVE validar que `dateTo >= dateFrom` com mensagem descritiva
</requirements>

## Subtasks

- [x] 6.1 Criar `src/app/api/dje/searches/schema.ts` com `DjeSearchSchema` e tipos derivados
- [x] 6.2 Implementar `POST /api/dje/searches` e `GET /api/dje/searches` em `route.ts`
- [x] 6.3 Implementar `GET /api/dje/searches/[id]` e `POST /api/dje/searches/[id]/rerun` em `[id]/route.ts` e `[id]/rerun/route.ts`
- [x] 6.4 Implementar `GET /api/dje/searches/[id]/export` em `[id]/export/route.ts` reutilizando o padrão de stream CSV de `src/lib/export/csv.ts`
- [x] 6.5 Escrever testes de integração para todos os endpoints

## Implementation Details

Referencie a seção "API Endpoints" do TechSpec para os formatos de request, response e códigos de status de cada endpoint.

Analisar `src/app/api/searches/route.ts` e `src/app/api/searches/[id]/export/route.ts` — os padrões de autenticação (`session?.user?.id`), validação Zod (`SearchFiltersSchema.parse()`), resposta de erro e streaming CSV devem ser idênticos. A exportação CSV pode reusar a estrutura de `src/lib/export/csv.ts` — criar novo helper `djePublicationToCsvRow` dentro deste arquivo ou em `src/lib/dje/export.ts`.

O snippet retornado por `searchPublications` contém HTML (`<mark>...</mark>`) — a API DEVE retornar o campo `snippet` como string sem sanitização adicional; o frontend é responsável por renderizar o HTML de forma segura (via `dangerouslySetInnerHTML` em span).

### Relevant Files

- `src/app/api/dje/searches/route.ts` — criar (POST + GET list)
- `src/app/api/dje/searches/schema.ts` — criar (Zod schema)
- `src/app/api/dje/searches/[id]/route.ts` — criar (GET paginado + POST rerun)
- `src/app/api/dje/searches/[id]/export/route.ts` — criar (CSV stream)
- `src/app/api/searches/route.ts` — referência de padrão (não modificar)
- `src/app/api/searches/[id]/export/route.ts` — referência de padrão CSV (não modificar)
- `src/lib/export/csv.ts` — referenciar padrão de streaming CSV
- `src/db/dje.ts` (task_04) — importar funções de query
- `src/auth.ts` — importar `auth` para verificar sessão

### Dependent Files

- `src/app/(protected)/dje/page.tsx` (task_07) — consome `POST /api/dje/searches` e `GET /api/dje/searches/[id]`
- `src/app/(protected)/dje/history/page.tsx` (task_08) — consome `GET /api/dje/searches` e `POST /api/dje/searches/[id]/rerun`

### Related ADRs

- [ADR-004: Estratégia de Resultados de Busca DJE — Requery ao Vivo](adrs/adr-004.md) — justifica por que `GET /api/dje/searches/[id]` re-executa a query ao vivo em vez de servir snapshot

## Deliverables

- 5 route handlers criados em `src/app/api/dje/searches/`
- `src/app/api/dje/searches/schema.ts` com `DjeSearchSchema`
- Testes de integração em `src/app/api/searches/__tests__/dje-route.test.ts` com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes de integração (padrão dos testes em `src/app/api/searches/__tests__/route.test.ts`):
  - [x] `POST /api/dje/searches` sem sessão retorna 401
  - [x] `POST /api/dje/searches` com `term: 'a'` (menos de 2 chars) retorna 422 com mensagem de validação
  - [x] `POST /api/dje/searches` com `dateFrom: '2026-08-07'` e `dateTo: '2026-08-01'` (dateTo < dateFrom) retorna 422
  - [x] `POST /api/dje/searches` com dados válidos retorna 201 com `searchId` e `results` (page 1)
  - [x] `POST /api/dje/searches` com dados válidos persiste entrada em `dje_searches` com `total_results` correto
  - [x] `GET /api/dje/searches` sem sessão retorna 401
  - [x] `GET /api/dje/searches` retorna somente buscas do usuário autenticado (não de outros usuários)
  - [x] `GET /api/dje/searches/[id]` com ID de busca de outro usuário retorna 404
  - [x] `GET /api/dje/searches/[id]?page=2&limit=10` re-executa query com offset correto
  - [x] `POST /api/dje/searches/[id]/rerun` cria nova `dje_searches` com mesmo `term` e retorna 201 com novo `searchId` diferente do original
  - [x] `GET /api/dje/searches/[id]/export` retorna Content-Type `text/csv` e header `Content-Disposition` com filename correto
  - [x] CSV exportado contém linha de header com colunas `numero_cnj,instancia,vara_camara,data_publicacao,caderno,texto_completo`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `POST /api/dje/searches` retorna resultados em menos de 5 segundos para período de 90 dias
- CSV exportado abre corretamente em Excel/Google Sheets com acentuação UTF-8 preservada
- Nenhum endpoint expõe dados de outros usuários (ownership enforcement verificado nos testes)
