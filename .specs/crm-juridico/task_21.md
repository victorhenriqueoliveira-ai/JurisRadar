---
status: completed
title: API Calendário — endpoints GET/POST/PUT/DELETE com validação de drag em prazo fatal
type: backend
complexity: high
dependencies:
  - task_16
  - task_17
---

# Task 21: API Calendário — endpoints GET/POST/PUT/DELETE com validação de drag em prazo fatal

## Overview

Implementa as rotas de API do calendário que consomem a view `v_eventos_calendario` para leitura e roteiam updates/deletes para a tabela correta (`eventos_calendario` ou `eventos_agenda`) com base no campo `fonte`. Inclui a rota `foco-do-dia` e a validação que impede drag de `prazo_fatal` para datas passadas.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- 1. DEVE criar `GET /api/calendario/eventos` que consulta `v_eventos_calendario` com filtros `start`, `end`, `tipo`, `responsavelId` e `orgId` do contexto.
- 2. DEVE criar `POST /api/calendario/eventos` que insere em `eventos_calendario` (se `processo_id` presente) ou `eventos_agenda` (se ausente).
- 3. DEVE criar `PUT /api/calendario/eventos/[id]` que usa `fonte` do body ('calendario' | 'agenda') para redirecionar o UPDATE à tabela correta.
- 4. DEVE criar `DELETE /api/calendario/eventos/[id]` com mesma lógica de roteamento por `fonte`.
- 5. DEVE criar `GET /api/calendario/foco-do-dia` que retorna todos os eventos e tarefas do dia atual do usuário autenticado.
- 6. `PUT /api/calendario/eventos/[id]` DEVE retornar 422 com mensagem `"Prazo fatal não pode ser movido para data passada."` quando `tipo='prazo_fatal'` e `data < today`.
- 7. TODAS as rotas DEVEM usar `requireOrgContext()`.
- 8. DEVE verificar que o evento pertence ao `org_id` do usuário antes de UPDATE/DELETE.
</requirements>

## Subtasks

- [x] 21.1 Criar `GET /api/calendario/eventos` consultando `v_eventos_calendario`
- [x] 21.2 Criar `POST /api/calendario/eventos` com roteamento por presença de `processo_id`
- [x] 21.3 Criar `PUT /api/calendario/eventos/[id]` com roteamento por `fonte` e validação de prazo fatal
- [x] 21.4 Criar `DELETE /api/calendario/eventos/[id]` com roteamento por `fonte`
- [x] 21.5 Criar `GET /api/calendario/foco-do-dia`
- [x] 21.6 Escrever testes unitários e de integração para todas as rotas

## Implementation Details

Ver seção "API Endpoints — Calendário" do TechSpec v2.0 para os contratos de request/response. A view `v_eventos_calendario` é somente-leitura no Postgres — updates devem ser roteados para as tabelas base usando o campo `fonte` retornado pela view.

Verificar `src/services/calendario.ts` existente para reuso de queries antes de criar novas. O padrão de route handler com `requireOrgContext()` pode ser referenciado em qualquer rota existente em `src/app/api/`.

### Relevant Files

- `src/services/calendario.ts` — service existente de calendário; reaproveitar e estender
- `src/lib/org-context.ts` — `requireOrgContext()` obrigatório
- `src/db/schema.ts` — view `v_eventos_calendario` e tabelas base (task_16)
- `src/app/(app)/calendario/page.tsx` — consumidor das novas rotas

### Dependent Files

- `src/components/calendario/CalendarioProcessual.tsx` — task_22 consumirá estas rotas via fetch
- `src/app/(app)/calendario/page.tsx` — atualizar fetch para novas rotas se necessário

### Related ADRs

- [ADR-008: Unificação de Visualização do Calendário — SQL View](../adrs/adr-008.md) — justifica leitura via view e updates nas tabelas base

## Deliverables

- Rotas GET, POST, PUT, DELETE em `/api/calendario/eventos` e GET `/api/calendario/foco-do-dia`
- Validação de prazo fatal em PUT retornando 422
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para todos os endpoints **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `GET /api/calendario/eventos?start=2026-10-01&end=2026-10-31` retorna eventos de ambas as tabelas (fonte 'calendario' e 'agenda')
  - [ ] `GET /api/calendario/eventos` sem `start`/`end` retorna 400
  - [ ] `PUT /api/calendario/eventos/[id]` com `tipo='prazo_fatal'` e `data='2026-01-01'` (passado) retorna 422
  - [ ] `PUT /api/calendario/eventos/[id]` com `fonte='calendario'` atualiza `eventos_calendario` e não toca `eventos_agenda`
  - [ ] `DELETE /api/calendario/eventos/[id]` com `fonte='agenda'` deleta de `eventos_agenda`
  - [ ] `PUT /api/calendario/eventos/[id]` com evento de outro `org_id` retorna 403
  - [ ] `GET /api/calendario/foco-do-dia` retorna apenas eventos da data atual do usuário autenticado
- Testes de integração:
  - [ ] `POST /api/calendario/eventos` com `processo_id` → verifica INSERT em `eventos_calendario`
  - [ ] `POST /api/calendario/eventos` sem `processo_id` → verifica INSERT em `eventos_agenda`
  - [ ] Ciclo completo: POST → GET → PUT (nova data) → GET (data atualizada) → DELETE → GET (vazio)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Drag de prazo fatal para data passada bloqueado com mensagem clara
- Eventos de ambas as tabelas aparecem na listagem via view unificada
- Update/delete roteado corretamente pela tabela de origem
