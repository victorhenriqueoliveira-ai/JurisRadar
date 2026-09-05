---
status: completed
title: Schema v2 — tabelas clientes, comunicacoes_cliente, view v_eventos_calendario e colunas em eventos
type: backend
complexity: critical
dependencies: []
---

# Task 16: Schema v2 — tabelas clientes, comunicacoes_cliente, view v_eventos_calendario e colunas em eventos

## Overview

Esta tarefa estende o schema do banco de dados para suportar os três novos blocos do TechSpec v2.0: entidade `clientes` normalizada, histórico de comunicações com cliente, view unificada de eventos do calendário e campos adicionais nas tabelas de eventos existentes. É o pré-requisito crítico para todas as tasks 19–23.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- 1. DEVE criar tabela `clientes(id, org_id, nome, email, whatsapp, cpf_cnpj, created_at)` com unique constraint `(org_id, cpf_cnpj)` e índice em `org_id`.
- 2. DEVE criar tabela `comunicacoes_cliente(id, org_id, cliente_id, processo_id, canal, mensagem, enviado_por, created_at)` com índices em `processo_id` e `cliente_id`.
- 3. DEVE criar view SQL `v_eventos_calendario` fazendo UNION de `eventos_calendario` e `eventos_agenda` com coluna discriminadora `fonte` ('calendario' | 'agenda').
- 4. DEVE adicionar colunas `hora_inicio TEXT`, `hora_fim TEXT`, `responsavel_id UUID REFERENCES users(id)`, `origem TEXT NOT NULL DEFAULT 'manual'` na tabela `eventos_calendario`.
- 5. DEVE adicionar coluna `responsavel_id UUID REFERENCES users(id)` na tabela `eventos_agenda`.
- 6. DEVE gerar e aplicar migration via `drizzle-kit` (padrão já adotado no projeto).
- 7. DEVE garantir que todas as novas tabelas possuem `org_id` com FK para `organizations(id)` — padrão multi-tenant do projeto.
- 8. NÃO DEVE remover ou alterar colunas existentes — apenas adições não-destrutivas.
</requirements>

## Subtasks

- [x] 16.1 Adicionar entidades `clientes` e `comunicacoes_cliente` no schema Drizzle (`src/db/schema.ts`)
- [x] 16.2 Adicionar colunas em `eventos_calendario`: `hora_inicio`, `hora_fim`, `responsavel_id`, `origem`
- [x] 16.3 Adicionar coluna `responsavel_id` em `eventos_agenda`
- [x] 16.4 Criar view SQL `v_eventos_calendario` (UNION com coluna `fonte`)
- [x] 16.5 Gerar e aplicar migration com `drizzle-kit generate` + `drizzle-kit migrate`
- [x] 16.6 Registrar migration no journal do Drizzle

## Implementation Details

Ver seção "Data Models — Novas tabelas — Calendário e Comunicações" e "Modificações em tabelas existentes" do TechSpec v2.0 para os DDLs completos.

A view `v_eventos_calendario` deve ser criada como SQL raw no arquivo de migration (Drizzle não suporta views nativamente) — usar `sql` helper do Drizzle Kit ou migration manual.

### Relevant Files

- `src/db/schema.ts` — schema Drizzle principal; adicionar as novas entidades aqui
- `drizzle/` — diretório de migrations geradas pelo drizzle-kit
- `drizzle.config.ts` — configuração do drizzle-kit

### Dependent Files

- `src/services/comunicacao-cliente.ts` — será criado na task_19 usando as novas tabelas
- `src/services/calendario.ts` — será atualizado na task_21 para consumir `v_eventos_calendario`
- `src/inngest/calendario-auto-event-creator.ts` — task_20 depende do campo `origem` em `eventos_calendario`

### Related ADRs

- [ADR-008: Unificação de Visualização do Calendário — SQL View](../adrs/adr-008.md) — Justifica a view UNION em vez de migração de dados
- [ADR-009: Modelo de Dados de Cliente — Tabela Normalizada](../adrs/adr-009.md) — Justifica `clientes` + `comunicacoes_cliente` em vez de JSONB ou desnormalização

## Deliverables

- Entidades `clientes` e `comunicacoes_cliente` no schema Drizzle com todos os campos, índices e FKs
- Colunas adicionadas em `eventos_calendario` e `eventos_agenda`
- View `v_eventos_calendario` funcionando no banco
- Arquivo de migration gerado e aplicado
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para as novas tabelas **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Insert em `clientes` com `cpf_cnpj` duplicado para o mesmo `org_id` viola unique constraint
  - [ ] Insert em `clientes` com mesmo `cpf_cnpj` mas `org_id` diferente é permitido (isolamento multi-tenant)
  - [ ] Insert em `comunicacoes_cliente` com `cliente_id` inexistente viola FK
  - [ ] Insert em `eventos_calendario` sem `origem` usa default 'manual'
- Testes de integração:
  - [ ] `SELECT * FROM v_eventos_calendario WHERE org_id = ?` retorna eventos de ambas as tabelas com coluna `fonte` correta
  - [ ] Migration aplicada sem erro em banco limpo
  - [ ] Migration aplicada sem erro em banco com dados existentes em `eventos_calendario` e `eventos_agenda`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Migration aplicada sem downtime (sem DROP de colunas existentes)
- View `v_eventos_calendario` retorna registros de ambas as tabelas com `fonte` discriminador correto
- Tasks 19–23 conseguem ser iniciadas sem bloqueio de schema
