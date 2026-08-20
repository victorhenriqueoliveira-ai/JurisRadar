---
status: completed
title: Notificações in-app: persistência, sino e painel
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
  - task_08
---

# Task 10: Notificações in-app: persistência, sino e painel

## Overview

Implementa o sistema completo de notificações in-app: endpoints de listagem e marcação como lida, componente de sino com badge de contagem no header (usando polling de 30s) e painel lateral de notificações com marcação individual e em massa. As notificações são criadas pelo dispatcher da task_11; esta task cria a infraestrutura de leitura e UI.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 4: Monitoramento e Notificações") e o TechSpec (seção "API Endpoints — Notificações") antes de começar
- REFERENCIE O TECHSPEC para os endpoints de notificações e a estratégia de polling (30s)
- FOQUE NO "QUÊ" — UI de notificações e endpoints de leitura; o dispatch é feito na task_11
- MINIMIZE CÓDIGO — use shadcn/ui Sheet e Badge; o bell icon usa Lucide `Bell`
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE implementar `GET /api/notificacoes` com filtro `?lida=false&limit=20` e paginação por cursor
- DEVE implementar `PATCH /api/notificacoes/:id/lida` para marcar notificação individual como lida
- DEVE implementar `PATCH /api/notificacoes/lida-todas` para marcar todas como lidas
- DEVE implementar `GET /api/notificacoes/count` retornando `{ count: number }` de não lidas (endpoint leve para polling)
- DEVE atualizar o componente `AppHeader` (task_04) para incluir sino com badge de contagem usando polling de 30s via `setInterval`
- DEVE criar painel lateral de notificações (Sheet) acionado pelo sino, listando notificações em ordem cronológica decrescente
- DEVE exibir notificações com: ícone por tipo, título, processo relacionado (link), data e status lida/não lida
- DEVE permitir clicar na notificação para navegar ao processo no CRM e marcar como lida automaticamente
- NUNCA expor notificações de um usuário para outro usuário (filtrar sempre por `user_id` + `org_id`)
</requirements>

## Subtasks

- [x] 10.1 Criar endpoints `GET /api/notificacoes`, `PATCH /api/notificacoes/:id/lida`, `PATCH /api/notificacoes/lida-todas`, `GET /api/notificacoes/count`
- [x] 10.2 Criar `src/services/notificacoes.ts` com queries Drizzle para os endpoints
- [x] 10.3 Atualizar `AppHeader` para polling de `GET /api/notificacoes/count` a cada 30s e exibir badge
- [x] 10.4 Criar componente `NotificacoesSheet` com lista, marcação de lidas e link para processo
- [x] 10.5 Implementar marcação automática como lida ao clicar na notificação e navegar
- [x] 10.6 Criar `src/app/(app)/notificacoes/page.tsx` com listagem completa e histórico
- [x] 10.7 Escrever testes de endpoints e do polling de contagem

## Implementation Details

Arquivos a criar:
- `src/app/api/notificacoes/route.ts` — GET (listagem)
- `src/app/api/notificacoes/count/route.ts` — GET (contagem de não lidas)
- `src/app/api/notificacoes/lida-todas/route.ts` — PATCH (marcar todas)
- `src/app/api/notificacoes/[id]/lida/route.ts` — PATCH (marcar uma)
- `src/services/notificacoes.ts` — queries Drizzle
- `src/components/layout/NotificacoesSheet.tsx` — painel lateral de notificações
- `src/app/(app)/notificacoes/page.tsx` — página de histórico completo

Arquivos a modificar:
- `src/components/layout/AppHeader.tsx` (task_04) — adicionar polling e badge de contagem

### Relevant Files

- `src/components/layout/AppHeader.tsx` (task_04) — sino vai aqui
- `src/db/schema.ts` (task_02) — tabela `notificacoes` com `user_id`, `org_id`, `lida`, `tipo`
- `src/lib/org-context.ts` (task_03) — `requireOrgContext()` obrigatório em todos os endpoints

### Dependent Files

- `src/inngest/notificacao-dispatcher.ts` (task_11) — criará registros em `notificacoes`; esta task cria a tabela e endpoints de leitura
- `src/app/(app)/crm/` (task_09) — clicar numa notificação navega para processo no CRM

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — notificações filtradas por `user_id` + `org_id`

## Deliverables

- 4 endpoints de notificações implementados
- `AppHeader` com polling de contagem e badge
- `NotificacoesSheet` com listagem e marcação de lidas
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `GET /api/notificacoes/count` retorna `{ count: 0 }` para usuário sem notificações
  - [x] `GET /api/notificacoes/count` retorna `{ count: 3 }` para usuário com 3 não lidas
  - [x] `PATCH /api/notificacoes/:id/lida` com ID de notificação de outro usuário retorna 403
  - [x] `PATCH /api/notificacoes/lida-todas` marca apenas as notificações do usuário autenticado
- Testes de integração:
  - [x] Polling de 30s no `AppHeader` chama `GET /api/notificacoes/count` e atualiza badge
  - [x] Clicar numa notificação no painel chama `PATCH /:id/lida` e remove o badge daquele item
  - [x] `GET /api/notificacoes` de usuário do org A não retorna notificações do org B
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Badge de contagem atualiza sem refresh de página (via polling)
- Notificação de usuário A nunca visível para usuário B mesmo no mesmo escritório
- Clicar na notificação navega para o processo e marca como lida atomicamente
