---
status: pending
title: CRM backend: endpoints de processos, movimentações e notas
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
  - task_07
---

# Task 08: CRM backend: endpoints de processos, movimentações e notas

## Overview

Implementa todos os endpoints REST do CRM: listagem paginada com filtros, detalhe de processo com movimentações, arquivamento, atribuição de responsável e notas internas. Todos os endpoints garantem isolamento por `org_id` via `requireOrgContext()`.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 3: CRM de Processos") e o TechSpec (seção "API Endpoints — Processos") antes de começar
- REFERENCIE O TECHSPEC para a tabela completa de endpoints, parâmetros e códigos de status
- FOQUE NO "QUÊ" — endpoints e lógica de negócio; não construir UI (task_09)
- MINIMIZE CÓDIGO — use Server Actions do Next.js para mutações; Route Handlers apenas para GET com paginação
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE implementar `GET /api/processos` com filtros: `status`, `area`, `tribunal`, `responsavel_id`, `urgencia`, `q` (busca por número CNJ ou nome da parte) e paginação por cursor
- DEVE implementar `GET /api/processos/:id` retornando processo + últimas 50 movimentações + honorário + notas
- DEVE implementar `PATCH /api/processos/:id` para alterar `responsavel_id` e `status`; restrito a papel ≥ associado
- DEVE implementar `DELETE /api/processos/:id` (arquivamento soft: seta `arquivado_at`, não deleta)
- DEVE implementar `POST /api/processos/:id/notas` para adicionar nota interna; papel ≥ associado
- DEVE implementar `DELETE /api/processos/:id/notas/:notaId` permitido apenas ao autor ou ao sócio
- TODOS os endpoints DEVEM filtrar por `org_id` derivado de `requireOrgContext()` — nunca aceitar `org_id` do request body
- DEVE retornar 403 ao tentar acessar processo de outro escritório
- DEVERIA retornar `ultima_sync_at` de cada processo na listagem para o frontend exibir indicador de frescor
</requirements>

## Subtasks

- [ ] 8.1 Criar `GET /api/processos` com filtros, ordenação e paginação por cursor
- [ ] 8.2 Criar `GET /api/processos/:id` com movimentações, honorário e notas
- [ ] 8.3 Criar `PATCH /api/processos/:id` para responsável e status com verificação de papel
- [ ] 8.4 Criar `DELETE /api/processos/:id` (soft delete via `arquivado_at`)
- [ ] 8.5 Criar `POST /api/processos/:id/notas` e `DELETE /api/processos/:id/notas/:notaId`
- [ ] 8.6 Criar `src/services/processos.ts` com queries Drizzle reutilizáveis por estes endpoints
- [ ] 8.7 Escrever testes de isolamento multi-tenant e de controle de acesso por papel

## Implementation Details

Arquivos a criar:
- `src/app/api/processos/route.ts` — GET (listagem) com filtros e paginação
- `src/app/api/processos/[id]/route.ts` — GET (detalhe), PATCH (atualizar), DELETE (arquivar)
- `src/app/api/processos/[id]/notas/route.ts` — POST (criar nota)
- `src/app/api/processos/[id]/notas/[notaId]/route.ts` — DELETE (remover nota)
- `src/services/processos.ts` — queries Drizzle: `listProcessos`, `getProcesso`, `archiveProcesso`, `addNota`, `deleteNota`

Veja a seção "API Endpoints — Processos" do TechSpec para a especificação completa de cada endpoint (parâmetros, response, códigos de status).

### Relevant Files

- `src/lib/org-context.ts` (task_03) — `requireOrgContext()` obrigatório em todo endpoint
- `src/db/schema.ts` (task_02) — tabelas `processos`, `movimentacoes`, `notas_processo`, `honorarios`
- `src/lib/datajud/client.ts` — padrão de tratamento de erro a seguir nos endpoints

### Dependent Files

- `src/app/(app)/crm/page.tsx` (task_09) — consumirá `GET /api/processos` e `GET /api/processos/:id`
- `src/app/(app)/dashboard/page.tsx` (task_13) — dashboard consumirá `GET /api/dashboard` que agrega dados de `processos`
- `src/app/(app)/financeiro/page.tsx` (task_16) — consumirá honorários via `GET /api/financeiro`

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — todos os endpoints devem usar `requireOrgContext()` e filtrar por `org_id`

## Deliverables

- 6 endpoints de processos e notas implementados
- `src/services/processos.ts` com queries reutilizáveis
- Testes de isolamento e controle de acesso com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `listProcessos({ orgId: 'A', status: 'ativo' })` retorna apenas processos do org A com status ativo
  - [ ] `archiveProcesso({ orgId: 'A', processoId: 'X' })` seta `arquivado_at` sem deletar o registro
  - [ ] `deleteNota` com `userId` diferente do autor e papel `associado` lança `ForbiddenError`
  - [ ] `deleteNota` com papel `socio` deleta nota de qualquer autor
- Testes de integração:
  - [ ] `GET /api/processos/:id` com `id` de processo de outro escritório retorna 403
  - [ ] `GET /api/processos` sem filtros retorna lista paginada apenas do escritório do usuário autenticado
  - [ ] `PATCH /api/processos/:id` com papel `estagiario` retorna 403
  - [ ] `POST /api/processos/:id/notas` com `conteudo` vazio retorna 400
  - [ ] `DELETE /api/processos/:id` realiza soft delete: processo não aparece na listagem mas existe no banco
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Usuário do org A nunca recebe dados do org B em nenhum endpoint
- Estagiário não consegue mutar dados (PATCH/DELETE retornam 403)
- Arquivamento é reversível: processo continua no banco com `arquivado_at` preenchido
