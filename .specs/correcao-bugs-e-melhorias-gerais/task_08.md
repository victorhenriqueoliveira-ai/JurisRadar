---
status: pending
title: Nova rota GET /api/dashboard/summary
type: backend
complexity: medium
dependencies: []
---

# Task 08: Nova rota `GET /api/dashboard/summary`

## Overview
Para habilitar o polling client-side do dashboard (ADR-003), é necessária uma rota de API que retorne os dados agregados do dashboard em JSON. Esta tarefa cria `GET /api/dashboard/summary`, reutilizando os services `aggregateDashboard()` e `getPrazosUrgentes()` já existentes, e adiciona o campo `lastSyncAt` com o timestamp do último sync OAB da organização.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `src/app/api/dashboard/summary/route.ts` com método GET
- DEVE reutilizar `aggregateDashboard()` e `getPrazosUrgentes()` de `src/services/dashboard.ts`
- DEVE adicionar `lastSyncAt`: maior valor de `ultimaSyncAt` entre todos os processos da org (ou `null`)
- DEVE aceitar `scope=pessoal|escritorio` como query param (mesmo comportamento do dashboard existente)
- DEVE retornar 403 para `scope=escritorio` quando usuário não tem role `'socio'`
- DEVE usar `next: { revalidate: 15 }` no fetch interno para reduzir carga no banco
- NÃO DEVE expor dados de outras organizações (isolamento multi-tenant via `requireOrgContext()`)
- DEVE retornar o shape `DashboardSummaryResponse` definido no TechSpec > Core Interfaces
</requirements>

## Subtasks
- [ ] 8.1 Criar `src/app/api/dashboard/summary/route.ts` com handler GET
- [ ] 8.2 Chamar `aggregateDashboard()` e `getPrazosUrgentes()` em paralelo (`Promise.all`)
- [ ] 8.3 Buscar `lastSyncAt` como `MAX(ultimaSyncAt)` dos processos da org
- [ ] 8.4 Montar e retornar o `DashboardSummaryResponse` completo
- [ ] 8.5 Escrever testes unitários e de integração para a rota

## Implementation Details
Arquivo a criar: `src/app/api/dashboard/summary/route.ts`

Reusar imports de `src/services/dashboard.ts` (`aggregateDashboard`, `getPrazosUrgentes`) e `src/lib/auth.ts` (`requireOrgContext`).

Query para `lastSyncAt`:
```ts
// Buscar MAX(ultimaSyncAt) da tabela processos para a org
// Ver schema: processos.ultimaSyncAt é timestamp
```

Ver TechSpec > Core Interfaces > "DashboardSummaryResponse" para o shape completo do response.
Ver TechSpec > API Endpoints > "NOVO — GET /api/dashboard/summary" para códigos de status.

### Relevant Files
- `src/services/dashboard.ts` — `aggregateDashboard()` e `getPrazosUrgentes()` a reutilizar
- `src/db/schema.ts` — schema de `processos` com campo `ultimaSyncAt`
- `src/lib/auth.ts` (ou equivalente) — `requireOrgContext()` para multi-tenant

### Dependent Files
- `src/components/dashboard/DashboardPoller.tsx` — consumirá esta rota (task_09)
- `src/app/(app)/dashboard/page.tsx` — passará `initialData` para o poller (task_10)

### Related ADRs
- [ADR-001: Estratégia de Atualização do Dashboard Após Sync OAB](adrs/adr-001.md) — esta rota é o endpoint de polling definido no ADR
- [ADR-003: Polling do Dashboard via Rota /api/dashboard/summary](adrs/adr-003.md) — decisão de criar esta rota em vez de usar router.refresh()

## Deliverables
- `src/app/api/dashboard/summary/route.ts` criado
- Testes unitários e de integração **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [ ] GET retorna shape `DashboardSummaryResponse` completo com todos os campos obrigatórios
  - [ ] `lastSyncAt` é `null` quando nenhum processo da org foi sincronizado
  - [ ] `lastSyncAt` retorna o maior `ultimaSyncAt` quando há processos sincronizados
  - [ ] `scope=escritorio` com role `'associado'` retorna 403
  - [ ] `scope=pessoal` (default) retorna 200 com dados filtrados pelo `userId`
- Testes de integração:
  - [ ] GET com sessão válida retorna 200 e dados coerentes com o banco
  - [ ] GET sem sessão retorna 401
  - [ ] `Promise.all` de `aggregateDashboard` e `getPrazosUrgentes` executados em paralelo (verificar com spy)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Rota retorna dados corretos da org autenticada em <500ms
- `lastSyncAt` reflete o último sync OAB real da organização
