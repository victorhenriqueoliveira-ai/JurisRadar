---
status: pending
title: Dashboard analítico: API de métricas e UI com gráficos
type: frontend
complexity: high
dependencies:
  - task_01
  - task_04
  - task_08
  - task_10
---

# Task 13: Dashboard analítico: API de métricas e UI com gráficos

## Overview

Constrói o dashboard analítico completo: endpoint de agregação de métricas e interface com cards de KPIs, gráficos de distribuição e timeline de movimentações recentes. É a primeira tela que o advogado vê ao fazer login — define a percepção de valor do produto.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 5: Dashboard Analítico") e o TechSpec (seção "API Endpoints — Dashboard") antes de começar
- REFERENCIE O TECHSPEC para os 3 endpoints de dashboard e os dados agregados de cada um
- FOQUE NO "QUÊ" — métricas e visualizações; não reimplementar lógica de processos
- MINIMIZE CÓDIGO — use Recharts para gráficos; `GlassCard` (task_01) para cards de KPIs
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE implementar `GET /api/dashboard` retornando: total de processos ativos, processos com urgência alta, prazos nos próximos 7 dias, intimações não lidas, distribuição por status (5 categorias), distribuição por área do direito, evolução mensal (últimos 6 meses)
- DEVE implementar `GET /api/dashboard/prazos` retornando até 5 prazos mais críticos com link para processo
- DEVE implementar `GET /api/dashboard/movimentacoes-recentes` retornando últimas 10 movimentações
- DEVE aceitar parâmetro `?scope=pessoal|escritorio` — sócios podem ver dados do escritório inteiro
- DEVE renderizar 4 cards KPI no topo usando `GlassCard` (task_01): total ativo, urgência alta, prazos 7 dias, intimações não lidas
- DEVE renderizar gráfico de rosca (distribuição por status) e gráfico de barras (por área do direito) via Recharts
- DEVE renderizar gráfico de linha (evolução mensal) via Recharts
- DEVE exibir lista dos 5 prazos mais críticos com link para CRM
- DEVE exibir timeline das últimas 10 movimentações
- DEVE funcionar em mobile: cards em grid 2×2, gráficos com scroll horizontal se necessário
</requirements>

## Subtasks

- [ ] 13.1 Criar `GET /api/dashboard`, `GET /api/dashboard/prazos` e `GET /api/dashboard/movimentacoes-recentes`
- [ ] 13.2 Criar `src/services/dashboard.ts` com queries de agregação Drizzle
- [ ] 13.3 Criar componente `DashboardKpis` com 4 cards `GlassCard` e dados reais
- [ ] 13.4 Criar componente `GraficoDistribuicaoStatus` (rosca) e `GraficoAreaDireito` (barras) com Recharts
- [ ] 13.5 Criar componente `GraficoEvolucaoMensal` (linha) com últimos 6 meses
- [ ] 13.6 Criar componentes `ListaPrazosUrgentes` e `TimelineMovimentacoes`
- [ ] 13.7 Integrar todos no `src/app/(app)/dashboard/page.tsx` com Skeleton durante carregamento

## Implementation Details

Arquivos a criar:
- `src/app/api/dashboard/route.ts` — GET com agregações
- `src/app/api/dashboard/prazos/route.ts` — GET prazos críticos
- `src/app/api/dashboard/movimentacoes-recentes/route.ts` — GET timeline
- `src/services/dashboard.ts` — queries de agregação
- `src/components/dashboard/DashboardKpis.tsx`
- `src/components/dashboard/GraficoDistribuicaoStatus.tsx`
- `src/components/dashboard/GraficoAreaDireito.tsx`
- `src/components/dashboard/GraficoEvolucaoMensal.tsx`
- `src/components/dashboard/ListaPrazosUrgentes.tsx`
- `src/components/dashboard/TimelineMovimentacoes.tsx`

Arquivos a modificar:
- `src/app/(app)/dashboard/page.tsx` (placeholder da task_04) — substituir com dashboard real

Instalar: `recharts` (verificar se já instalado; se não, adicionar)

### Relevant Files

- `src/components/ui-custom/GlassCard.tsx` (task_01) — cards de KPIs
- `src/db/schema.ts` (task_02) — tabelas `processos`, `movimentacoes`, `notificacoes`, `eventos_calendario`
- `src/services/processos.ts` (task_08) — reutilizar queries onde possível

### Dependent Files

Nenhum — o dashboard é folha na árvore de dependências de UI.

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — todas as queries filtram por `org_id`; sócio pode usar `scope=escritorio`

## Deliverables

- 3 endpoints de dashboard implementados
- `src/services/dashboard.ts` com queries de agregação
- Dashboard completo com KPIs, 3 gráficos, lista de prazos e timeline
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `aggregateDashboard({ orgId: 'A' })` retorna `totalAtivos`, `urgenciaAlta`, `prazos7Dias`, `intimacoesNaoLidas` como numbers
  - [ ] `aggregateDashboard({ orgId: 'A', scope: 'escritorio' })` inclui processos de todos os membros do org A
  - [ ] `aggregateDashboard({ orgId: 'A', scope: 'pessoal', userId: 'U1' })` retorna apenas processos onde `responsavel_id = 'U1'`
  - [ ] `GraficoDistribuicaoStatus` com dados vazios renderiza gráfico de rosca vazio sem erro
- Testes de integração:
  - [ ] `GET /api/dashboard` sem autenticação retorna 401
  - [ ] `GET /api/dashboard?scope=escritorio` com papel `estagiario` retorna 403
  - [ ] `GET /api/dashboard` com org sem processos retorna zeros em todos os campos
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Dashboard carrega em menos de 2s (LCP) com dados reais
- Gráficos renderizam corretamente em 375px (mobile) sem overflow
- Sócio vê dados do escritório inteiro; associado vê apenas seus próprios dados
