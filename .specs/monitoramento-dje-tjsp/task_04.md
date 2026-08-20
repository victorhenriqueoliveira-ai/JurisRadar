---
status: completed
title: Queries Drizzle para DJE
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 04: Queries Drizzle para DJE

## Overview

Implementa `src/db/dje.ts` com todas as queries Drizzle necessárias para o pipeline de indexação e para as API routes: inserção em batch de publicações, busca full-text com `tsvector`, gerenciamento de edições e histórico de buscas do usuário. Este módulo é a camada de acesso a dados de toda a feature DJE.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE exportar `createDjeEdition(date: string, caderno: 2 | 3): Promise<string>` que insere em `dje_editions` com status `'pending'` e retorna o `id`
- DEVE exportar `updateDjeEditionStatus(id: string, status: DjeEditionStatus['status'], publicationCount?: number, errorMessage?: string): Promise<void>`
- DEVE exportar `insertPublications(editionId: string, publications: DjePublication[]): Promise<number>` que insere em batch em `dje_publications` e retorna o total inserido; a coluna `search_vector` é gerada automaticamente pelo Postgres — NÃO incluí-la no INSERT
- DEVE exportar `searchPublications(params: DjeSearchParams, page: number, limit: number, userId: string): Promise<{ results: DjeSearchResult[]; total: number }>` que usa `plainto_tsquery('portuguese', $term)` e `ts_headline` para snippets
- DEVE exportar `createDjeSearch(userId: string, params: DjeSearchParams, name?: string, totalResults?: number): Promise<string>` que persiste em `dje_searches` e retorna o `id`
- DEVE exportar `getDjeSearch(id: string, userId: string): Promise<DjeSearch | null>` que valida ownership retornando `null` se `user_id` não corresponder
- DEVE exportar `listDjeSearches(userId: string, page: number, limit: number): Promise<{ searches: DjeSearch[]; total: number }>` ordenado por `created_at DESC`
- A query de `searchPublications` DEVE aplicar filtros de `dateFrom` e `dateTo` como `AND publication_date BETWEEN $dateFrom AND $dateTo`
- `ts_headline` DEVE ser chamado somente nas linhas do resultado final (após LIMIT/OFFSET), não no subquery de contagem
</requirements>

## Subtasks

- [x] 4.1 Criar `src/db/dje.ts` com as funções de gerenciamento de edições (`createDjeEdition`, `updateDjeEditionStatus`)
- [x] 4.2 Implementar `insertPublications` com inserção em batch (array de objetos) usando o padrão Drizzle do projeto
- [x] 4.3 Implementar `searchPublications` com query `tsvector` + `ts_headline` via SQL raw (Drizzle não tem suporte nativo a `plainto_tsquery` e `ts_headline`)
- [x] 4.4 Implementar `createDjeSearch`, `getDjeSearch` e `listDjeSearches`
- [x] 4.5 Escrever testes de integração com banco real (seguindo o padrão dos testes em `src/db/__tests__/searches.test.ts`)

## Implementation Details

Referencie a seção "Data Models" e "API Endpoints" do TechSpec para os formatos de entrada e saída de cada função.

O projeto usa `drizzle-orm` com `@neondatabase/serverless`. Analisar `src/db/searches.ts` para entender os padrões existentes: como usar `db.insert()`, `db.select()`, e como escrever SQL raw com `sql\`\`` do drizzle-orm para a query de tsvector.

A query de `searchPublications` precisará de SQL raw para `@@ plainto_tsquery` e `ts_headline` — o Drizzle suporta interpolação via `sql\`\`` tag. Ver `src/db/__tests__/searches.test.ts` como referência para setup de teste com banco real.

### Relevant Files

- `src/db/dje.ts` — arquivo a criar
- `src/db/schema.ts` (task_01) — importar `djeEditions`, `djePublications`, `djeSearches`
- `src/lib/dje/types.ts` (task_01) — importar `DjePublication`, `DjeSearchParams`, `DjeSearchResult`
- `src/db/searches.ts` — referência de padrão de queries (não modificar)
- `src/db/__tests__/searches.test.ts` — referência de padrão de testes de integração com DB

### Dependent Files

- `src/inngest/dje-indexer.ts` (task_05) — usa `createDjeEdition`, `updateDjeEditionStatus`, `insertPublications`
- `src/app/api/dje/searches/route.ts` (task_06) — usa `searchPublications`, `createDjeSearch`, `listDjeSearches`
- `src/app/api/dje/searches/[id]/route.ts` (task_06) — usa `getDjeSearch`, `searchPublications`

### Related ADRs

- [ADR-002: Mecanismo de Busca Full-Text — tsvector com Dicionário Português](adrs/adr-002.md) — define a query `plainto_tsquery('portuguese', ...)` e o uso de `ts_headline` para snippets
- [ADR-004: Estratégia de Resultados de Busca DJE — Requery ao Vivo](adrs/adr-004.md) — justifica a ausência de função `saveDjeSearchResults`

## Deliverables

- `src/db/dje.ts` com todas as 7 funções exportadas
- Testes de integração em `src/db/__tests__/dje.test.ts` com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes de integração (banco real ou mock Drizzle seguindo padrão do projeto):
  - [x] `createDjeEdition('2026-08-07', 2)` insere linha em `dje_editions` com `status = 'pending'` e retorna UUID válido
  - [x] `updateDjeEditionStatus(id, 'completed', 142)` atualiza `status` e `publication_count` sem alterar `created_at`
  - [x] `insertPublications(editionId, [pub1, pub2, pub3])` insere 3 linhas e retorna `3`
  - [x] `insertPublications` com array vazio retorna `0` sem erro
  - [x] `searchPublications({ term: 'execução fiscal', dateFrom: '2026-08-01', dateTo: '2026-08-07' }, 1, 50)` retorna somente publicações dentro do período com `snippet` não vazio
  - [x] `searchPublications` com termo inexistente no índice retorna `{ results: [], total: 0 }`
  - [x] `searchPublications` com `page: 2, limit: 10` retorna offset correto (itens 11-20)
  - [x] `getDjeSearch(id, wrongUserId)` retorna `null` (ownership check)
  - [x] `listDjeSearches(userId, 1, 20)` retorna buscas ordenadas por `created_at DESC`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `searchPublications` retorna resultados em menos de 5 segundos para período de 90 dias com índice populado
- Snippets via `ts_headline` contêm tags `<mark>` e `</mark>` em volta do termo buscado
- Nenhuma query carrega `search_vector` no SELECT (coluna de índice, não para exibição)
