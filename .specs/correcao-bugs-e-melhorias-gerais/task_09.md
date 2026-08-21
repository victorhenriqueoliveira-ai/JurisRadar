---
status: pending
title: DashboardPoller — client component de polling
type: frontend
complexity: medium
dependencies:
  - task_08
---

# Task 09: `DashboardPoller` — client component de polling

## Overview
Com a rota `/api/dashboard/summary` disponível (task_08), esta tarefa cria o `DashboardPoller`: um Client Component que faz fetch periódico a cada 30s, pausa quando a aba perde foco, e atualiza o estado local do dashboard sem recarregar a página. Recebe `initialData` do Server Component para renderização imediata sem loading state.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE ser um Client Component (`'use client'`)
- DEVE aceitar `initialData: DashboardSummaryResponse` e `pollIntervalMs?: number` (default 30_000) como props
- DEVE usar `initialData` para renderizar imediatamente sem loading state no primeiro render
- DEVE fazer fetch de `/api/dashboard/summary` a cada `pollIntervalMs` milissegundos
- DEVE pausar o polling quando `document.visibilityState === 'hidden'` e retomar ao voltar
- DEVE cancelar o intervalo no cleanup do `useEffect` (evitar memory leak)
- DEVE logar erros de fetch com `console.error('[DashboardPoller]', err)` sem quebrar o componente
- NÃO DEVE exibir loading state a cada tick de polling — apenas atualizar os dados silenciosamente
- O intervalo DEVE ser configurável via prop, não hardcoded
</requirements>

## Subtasks
- [ ] 9.1 Criar `src/components/dashboard/DashboardPoller.tsx` com `'use client'`
- [ ] 9.2 Implementar `useState` inicializado com `initialData`
- [ ] 9.3 Implementar `useEffect` com `setInterval` + cleanup
- [ ] 9.4 Adicionar listener `visibilitychange` para pausar/retomar polling
- [ ] 9.5 Renderizar os KPIs e listas do dashboard a partir do state interno
- [ ] 9.6 Escrever testes para o comportamento de polling e visibilidade

## Implementation Details
Arquivo a criar: `src/components/dashboard/DashboardPoller.tsx`

Ver TechSpec > Core Interfaces > "DashboardPoller — client component de polling" para a assinatura de props.
Ver TechSpec > ADR-003 > Notas de Implementação para o padrão de `visibilitychange` e cleanup.

O componente renderiza os mesmos elementos visuais do dashboard atual (KPI cards, gráficos, listas) — apenas muda a fonte dos dados de props estáticas para state gerenciado.

### Relevant Files
- `src/app/(app)/dashboard/page.tsx` — Server Component que passará `initialData` (task_10)
- `src/app/api/dashboard/summary/route.ts` — rota de polling (task_08)
- `src/services/dashboard.ts` — tipos `DashboardData` reutilizáveis

### Dependent Files
- `src/app/(app)/dashboard/page.tsx` — integrará o `DashboardPoller` (task_10)

### Related ADRs
- [ADR-001: Estratégia de Atualização do Dashboard Após Sync OAB](adrs/adr-001.md) — polling de 30s com aba em foco
- [ADR-003: Polling do Dashboard via Rota /api/dashboard/summary](adrs/adr-003.md) — define o padrão de implementação do poller

## Deliverables
- `src/components/dashboard/DashboardPoller.tsx` criado
- Testes unitários com mocks de timer e visibilidade **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [ ] Componente renderiza `initialData` imediatamente sem loading state
  - [ ] Após `pollIntervalMs`, `fetch('/api/dashboard/summary')` é chamado
  - [ ] Quando `document.visibilityState === 'hidden'`, polling é pausado
  - [ ] Quando aba volta ao foco, polling é retomado
  - [ ] Ao desmontar o componente, `clearInterval` é chamado (sem memory leak)
  - [ ] Erro no fetch é logado mas não quebra a renderização (state mantém último valor válido)
- Testes de integração:
  - [ ] Renderizar `DashboardPoller` com `initialData` e verificar que dados são exibidos sem requisição inicial
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Dashboard atualiza dados sem flash ou loading state visível a cada tick
- Nenhuma requisição de polling quando aba está em background
