---
status: completed
title: Schema de banco: tabelas multi-tenancy e migrations
type: backend
complexity: critical
dependencies: []
---

# Task 02: Schema de banco: tabelas multi-tenancy e migrations

## Overview

Expande o schema PostgreSQL/Drizzle para suportar o modelo multi-tenant do JurisRadar SaaS, criando 10 novas tabelas de domínio e modificando 3 existentes. Esta é a tarefa mais crítica do projeto: tudo que vem depois depende deste schema. Uma migration mal feita pode destruir dados de usuários existentes.

<critical>
- SEMPRE LEIA o PRD (seção "Restrições Técnicas") e o TechSpec (seção "Data Models") antes de começar
- REFERENCIE O TECHSPEC para o DDL completo de cada tabela, incluindo índices e constraints
- FOQUE NO "QUÊ" — definir schema e migrations; não implementar lógica de negócio
- MINIMIZE CÓDIGO — use as definições Drizzle do TechSpec como referência
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar as tabelas: `organizations`, `org_members`, `subscriptions`, `processos`, `movimentacoes`, `notificacoes`, `honorarios`, `pagamentos`, `notas_processo`, `eventos_calendario`
- DEVE modificar a tabela `users` adicionando colunas `cpf text`, `oab_numero text`, `oab_estado text(2)`, `totp_secret text`
- DEVE modificar as tabelas `searches` e `djeSearches` adicionando `org_id uuid` com FK para `organizations(id)`
- DEVE criar índices compostos obrigatórios: `(org_id, status)` em `processos`; `(processo_id, data DESC)` em `movimentacoes`; `(user_id, lida, created_at DESC)` em `notificacoes`; `(org_id, data)` em `eventos_calendario`
- DEVE criar migration de segurança para usuários existentes: cada usuário sem `org_id` recebe uma organização criada automaticamente e é vinculado como sócio
- NUNCA dropar colunas existentes — apenas adicionar
- DEVE garantir que todas as colunas `org_id` em tabelas de domínio sejam `NOT NULL` com FK cascade
- DEVE ter constraint UNIQUE em `(org_id, user_id)` na tabela `org_members`
- DEVE ter constraint UNIQUE em `(processo_id, externo_id)` em `movimentacoes` para evitar duplicatas
</requirements>

## Subtasks

- [x] 2.1 Adicionar definições Drizzle das 10 novas tabelas em `src/db/schema.ts`
- [x] 2.2 Adicionar colunas `cpf`, `oab_numero`, `oab_estado`, `totp_secret` à tabela `users` existente
- [x] 2.3 Adicionar coluna `org_id` às tabelas `searches` e `djeSearches`
- [x] 2.4 Gerar migration com `drizzle-kit generate` e revisar o SQL gerado antes de aplicar
- [x] 2.5 Escrever migration adicional de segurança: criar org padrão para cada usuário existente sem org
- [x] 2.6 Aplicar migrations em ambiente de desenvolvimento e verificar integridade referencial
- [x] 2.7 Escrever testes de schema validando constraints e relações

## Implementation Details

Arquivo principal a modificar:
- `src/db/schema.ts` — adicionar todas as definições Drizzle das novas tabelas

Arquivos a criar:
- `src/db/migrations/XXXX_add_organizations.sql` — gerado pelo `drizzle-kit generate`
- `src/db/migrations/XXXX_backfill_existing_users.sql` — migration manual de segurança para usuários existentes

Veja a seção "Data Models" do TechSpec para o DDL completo de cada tabela com todos os campos, tipos, índices e constraints.

Comandos de referência:
```
pnpm drizzle-kit generate
pnpm drizzle-kit migrate  # somente após revisão do SQL gerado
```

### Relevant Files

- `src/db/schema.ts` — schema Drizzle existente com tabelas `users`, `searches`, `searchResults`, `searchCache`, `djeEditions`, `djePublications`, `djeSearches`
- `drizzle.config.ts` — configuração do drizzle-kit (dialect, URL, migrations folder)
- `src/db/migrations/` — pasta de migrations existentes; verificar última migration antes de gerar nova

### Dependent Files

- `src/auth.ts` (task_03) — precisará dos tipos `organizations` e `org_members` para popular JWT
- `src/services/processos.ts` (task_07, task_08) — consumirá tabelas `processos` e `movimentacoes`
- `src/inngest/sync-processos-worker.ts` (task_07) — inserirá em `processos`, `movimentacoes`, `eventos_calendario`
- Todas as demais tasks backend dependem deste schema

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — Define a estratégia de isolamento e as colunas obrigatórias em cada tabela

## Deliverables

- `src/db/schema.ts` atualizado com todas as 10 novas tabelas e 3 tabelas modificadas
- Migrations geradas e revisadas em `src/db/migrations/`
- Migration de backfill para usuários existentes
- Testes de schema com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Inserir em `organizations` com `name` vazio retorna erro de constraint `NOT NULL`
  - [x] Inserir em `org_members` com mesmo `(org_id, user_id)` duas vezes retorna erro de constraint `UNIQUE`
  - [x] Inserir em `movimentacoes` com mesmo `(processo_id, externo_id)` duas vezes retorna erro de constraint `UNIQUE`
  - [x] Deletar `organizations` com `org_members` vinculados faz cascade delete nos membros
  - [x] Inserir `processos` sem `org_id` retorna erro de constraint `NOT NULL`
- Testes de integração:
  - [x] Migration aplicada em banco limpo cria todas as 10 novas tabelas sem erro
  - [x] Migration de backfill cria exatamente 1 organização por usuário existente sem org
  - [x] Após backfill, todos os usuários existentes têm `org_id` não nulo em `org_members`
  - [x] Índice `(org_id, status)` em `processos` existe após migration (verificar via `pg_indexes`)
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- `drizzle-kit migrate` aplica sem erro em banco de desenvolvimento
- Nenhum dado de usuário existente perdido após a migration de backfill
- Todas as constraints e índices do TechSpec presentes e validados
