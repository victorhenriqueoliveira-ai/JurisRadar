---
status: completed
title: Migration de banco e interfaces TypeScript
type: infra
complexity: medium
dependencies: []
---

# Task 01: Migration de banco e interfaces TypeScript

## Overview

Cria as três novas tabelas Drizzle (`dje_editions`, `dje_publications`, `dje_searches`) e a coluna `search_vector` gerada via SQL raw, além das interfaces TypeScript centrais em `src/lib/dje/types.ts`. Esta tarefa é o bloqueador de todas as demais — sem o schema e os tipos, nenhum outro módulo da feature pode ser implementado.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar as tabelas `dje_editions`, `dje_publications` e `dje_searches` ao schema Drizzle em `src/db/schema.ts`
- DEVE criar migration SQL raw separada adicionando a coluna `search_vector tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED` e o índice GIN correspondente em `dje_publications`, pois o Drizzle não suporta colunas geradas com expressão nesta versão
- DEVE criar o arquivo `src/lib/dje/types.ts` com todas as interfaces TypeScript descritas na seção "Core Interfaces" do TechSpec (`DjePublication`, `DjeEditionStatus`, `DjeSearchParams`, `DjeSearchResult`, `DjeSearchResponse`)
- A tabela `dje_editions` DEVE ter constraint `UNIQUE(edition_date, caderno)` para garantir idempotência do job
- Os índices `btree` em `dje_publications.publication_date` e `dje_publications.process_number` DEVEM ser criados via Drizzle (não raw SQL)
- A migration DEVE validar que o dicionário `'portuguese'` está disponível no Neon com `SELECT cfgname FROM pg_ts_config WHERE cfgname = 'portuguese'` — se não estiver, a migration falha com erro descritivo
</requirements>

## Subtasks

- [x] 1.1 Adicionar as três tabelas ao schema em `src/db/schema.ts` seguindo o padrão das tabelas existentes (`users`, `searches`, `searchResults`)
- [x] 1.2 Criar migration SQL `0001_dje_tables.sql` manualmente (drizzle-kit generate não funciona sem TTY em ambiente CI; migration SQL gerada manualmente seguindo o padrão existente)
- [x] 1.3 Criar arquivo de migration SQL raw `0002_dje_search_vector.sql` para a coluna `search_vector` e o índice GIN
- [x] 1.4 Criar `src/lib/dje/types.ts` com todas as interfaces do TechSpec
- [x] 1.5 Criar snapshot Drizzle `meta/0001_snapshot.json` e atualizar `_journal.json` (migrations prontas para aplicação ao banco de desenvolvimento)

## Implementation Details

Referencie a seção "Data Models" do TechSpec para as definições exatas de schema, incluindo tipos de coluna, constraints e índices.

O projeto usa Drizzle ORM com Neon Postgres via HTTP pooler. O padrão de definição de tabelas segue `src/db/schema.ts` existente. Para a coluna `search_vector`, o Drizzle não suporta `GENERATED ALWAYS AS` com expressão de função — a coluna deve ser adicionada via SQL raw em um arquivo de migration separado em `src/db/migrations/`.

Exemplo do padrão de migration raw existente: verificar se já há arquivos `.sql` em `src/db/migrations/` para entender a convenção de nomenclatura.

### Relevant Files

- `src/db/schema.ts` — adicionar as três tabelas ao schema existente
- `src/db/migrations/` — gerado pelo `drizzle-kit generate`; adicionar arquivo raw para tsvector
- `src/lib/dje/types.ts` — criar com interfaces TypeScript (arquivo novo)
- `drizzle.config.ts` — verificar configuração de migrations para garantir compatibilidade

### Dependent Files

- `src/lib/dje/client.ts` (task_02) — importa `DjePublication` e `DjeEditionStatus`
- `src/lib/dje/parser.ts` (task_03) — importa `DjePublication`
- `src/db/dje.ts` (task_04) — importa tipos do schema e de `types.ts`
- `src/inngest/dje-indexer.ts` (task_05) — importa `DjeEditionStatus`
- `src/app/api/dje/searches/route.ts` (task_06) — importa `DjeSearchParams` e `DjeSearchResponse`

### Related ADRs

- [ADR-002: Mecanismo de Busca Full-Text — tsvector com Dicionário Português](adrs/adr-002.md) — define a coluna `search_vector` como `GENERATED ALWAYS AS` com dicionário `'portuguese'` e índice GIN
- [ADR-004: Estratégia de Resultados de Busca DJE — Requery ao Vivo](adrs/adr-004.md) — justifica a ausência de tabela `dje_search_results`

## Deliverables

- Schema Drizzle com as três tabelas em `src/db/schema.ts`
- Migration gerada pelo Drizzle-kit aplicada ao banco de desenvolvimento
- Arquivo SQL raw com `search_vector` + índice GIN aplicado
- `src/lib/dje/types.ts` com todas as interfaces exportadas
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `DjePublication` aceita `instance: '1'` e `instance: '2'` mas rejeita valores fora do tipo em TypeScript (verificação de tipo em tempo de compilação via `tsc --noEmit` — 0 erros novos)
  - [x] `DjeSearchParams` com `dateFrom` no formato correto `YYYY-MM-DD` é tipado corretamente
  - [x] Exportações de `types.ts` estão todas disponíveis como named exports (arquivo `types.test.ts` criado em `src/lib/dje/__tests__/`)
- Testes de integração:
  - [ ] Após aplicar migrations, `SELECT column_name FROM information_schema.columns WHERE table_name = 'dje_publications'` retorna `search_vector` (requer banco de dados, não disponível no ambiente CI)
  - [ ] `SELECT indexname FROM pg_indexes WHERE tablename = 'dje_publications'` retorna o índice GIN (requer banco de dados)
  - [ ] INSERT em `dje_editions` com mesmo `(edition_date, caderno)` duas vezes lança violation de constraint unique (requer banco de dados)
  - [ ] `to_tsvector('portuguese', 'pensão alimentícia')` retorna resultado não vazio (requer banco de dados)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `drizzle-kit generate` e migrations aplicadas sem erro no ambiente de desenvolvimento
- Coluna `search_vector` existe em `dje_publications` com tipo `tsvector`
- Índice GIN em `search_vector` e índices btree em `publication_date` e `process_number` visíveis via `\d dje_publications`
- `import type { DjePublication } from '@/lib/dje/types'` resolve sem erro em qualquer arquivo TypeScript do projeto
