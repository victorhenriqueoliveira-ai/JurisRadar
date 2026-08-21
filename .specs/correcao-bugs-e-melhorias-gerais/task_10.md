---
status: pending
title: Integrar polling + botão sync manual no dashboard
type: frontend
complexity: medium
dependencies:
  - task_08
  - task_09
---

# Task 10: Integrar polling + botão sync manual no dashboard

## Overview
Com a rota de summary (task_08) e o `DashboardPoller` (task_09) prontos, esta tarefa integra o poller ao `dashboard/page.tsx`, adiciona o botão "Sincronizar agora" que dispara `POST /api/processos/sync`, e exibe o timestamp `lastSyncAt` do último sync OAB.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE buscar `initialData` via `GET /api/dashboard/summary` no Server Component e passar como prop ao `DashboardPoller`
- DEVE adicionar botão "Sincronizar agora" que POST para `/api/processos/sync` e exibe loading state durante o disparo
- DEVE exibir "Última sincronização: DD/MM/AAAA às HH:MM" usando o campo `lastSyncAt` do response
- DEVE exibir `null` como "Nunca sincronizado" quando `lastSyncAt` for nulo
- O botão "Sincronizar agora" DEVE ser desabilitado durante o disparo para evitar duplo clique
- NÃO DEVE recarregar a página completa ao clicar em "Sincronizar agora"
- O polling automático DEVE continuar funcionando independentemente do botão manual
</requirements>

## Subtasks
- [ ] 10.1 Buscar `initialData` de `/api/dashboard/summary` no Server Component do dashboard
- [ ] 10.2 Substituir renderização atual dos KPIs pelo `DashboardPoller` com `initialData`
- [ ] 10.3 Criar botão "Sincronizar agora" com estado de loading ao clicar
- [ ] 10.4 Implementar handler que POST `/api/processos/sync` e atualiza o estado do botão
- [ ] 10.5 Exibir `lastSyncAt` formatado ao lado do botão de sync
- [ ] 10.6 Escrever testes para o fluxo do botão e a exibição do timestamp

## Implementation Details
Arquivo a modificar: `src/app/(app)/dashboard/page.tsx`

O Server Component deve buscar `initialData` em paralelo com outros dados necessários para o layout. O `DashboardPoller` substitui a renderização direta dos dados do dashboard.

Ver TechSpec > System Architecture > Component Overview para o fluxo de dados.
Ver TechSpec > ADR-001 e ADR-003 para contexto de decisão.

### Relevant Files
- `src/app/(app)/dashboard/page.tsx` — página a modificar
- `src/components/dashboard/DashboardPoller.tsx` — componente a integrar (task_09)
- `src/app/api/processos/sync/route.ts` — rota assíncrona do botão manual

### Dependent Files
Nenhum arquivo depende desta tarefa (ponto final da cadeia de dashboard).

### Related ADRs
- [ADR-001: Estratégia de Atualização do Dashboard Após Sync OAB](adrs/adr-001.md) — define polling de 30s e botão manual
- [ADR-003: Polling do Dashboard via Rota /api/dashboard/summary](adrs/adr-003.md) — initialData via Server Component

## Deliverables
- `src/app/(app)/dashboard/page.tsx` modificado com `DashboardPoller` integrado
- Botão "Sincronizar agora" funcional com loading state e timestamp
- Testes unitários e de integração **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [ ] Clicar em "Sincronizar agora" desabilita o botão e exibe loading state
  - [ ] Após POST `/api/processos/sync` retornar 202, botão volta ao estado normal
  - [ ] `lastSyncAt` com valor ISO é formatado como "DD/MM/AAAA às HH:MM"
  - [ ] `lastSyncAt: null` exibe "Nunca sincronizado"
  - [ ] Clicar duas vezes rapidamente não dispara dois POSTs simultâneos
- Testes de integração:
  - [ ] Dashboard renderiza com `initialData` sem requisição adicional no carregamento inicial
  - [ ] Botão "Sincronizar agora" chama `POST /api/processos/sync` e exibe feedback ao usuário
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Dashboard exibe dados atualizados em até 30s após sync OAB sem ação do usuário
- Botão "Sincronizar agora" dispara sync imediato e exibe timestamp atualizado
