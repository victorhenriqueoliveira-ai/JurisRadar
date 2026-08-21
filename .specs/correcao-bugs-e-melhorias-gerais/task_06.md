---
status: pending
title: Fix filtro urgência no CRM (frontend)
type: bugfix
complexity: low
dependencies:
  - task_02
---

# Task 06: Fix filtro urgência no CRM (frontend)

## Overview
O filtro de urgência no CRM envia `urgencia=1` ao backend, que ignora o parâmetro. Esta tarefa move a filtragem de urgência para o frontend: após a lista de processos ser carregada, aplicar `filter()` client-side para exibir apenas processos com `diasRestantes <= 5`. O backend não é alterado.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE remover `urgencia` dos query params enviados ao backend (não enviar `urgencia=1`)
- DEVE aplicar filtro client-side nos processos carregados quando `filters.urgencia === true`
- DEVE definir "urgente" como processos com `diasRestantes <= 5` (calculado a partir de campo disponível nos dados)
- DEVE exibir chip/badge visual indicando que o filtro de urgência está ativo
- DEVE manter a contagem de resultados precisa para os itens visíveis após filtragem
- A limitação de que o filtro age apenas sobre itens já carregados DEVE ser documentada como comportamento conhecido (ADR-002)
</requirements>

## Subtasks
- [ ] 6.1 Remover `urgencia` dos params montados em `crm/page.tsx` antes do fetch
- [ ] 6.2 Aplicar `Array.filter()` sobre `processos` carregados quando `filters.urgencia` está ativo
- [ ] 6.3 Garantir que o chip de "Urgência ativa" aparece nos filtros ativos da UI
- [ ] 6.4 Atualizar contagem de resultados exibida para refletir a filtragem frontend
- [ ] 6.5 Escrever testes para o comportamento de filtragem client-side

## Implementation Details
Arquivos a modificar:
- `src/app/(app)/crm/page.tsx` — remover `urgencia` dos params do fetch; aplicar filtro após receber dados
- `src/components/crm/ProcessoFilters.tsx` — garantir chip visual para urgência ativa

Ver TechSpec > Impact Analysis para a lista completa de componentes afetados.
Ver ADR-002 para a justificativa da limitação de filtragem por página.

### Relevant Files
- `src/app/(app)/crm/page.tsx` — monta params e gerencia estado de processos
- `src/components/crm/ProcessoFilters.tsx` — UI de filtros com toggle urgência
- `src/components/crm/ProcessoTable.tsx` — exibe a lista filtrada

### Dependent Files
- `src/components/crm/ProcessoTable.tsx` — recebe a lista já filtrada como prop

### Related ADRs
- [ADR-002: Cálculo de proximoPrazo e Filtro de Urgência no CRM](adrs/adr-002.md) — define que urgência é calculada no frontend; limitação de paginação é aceita

## Deliverables
- `src/app/(app)/crm/page.tsx` modificado
- `src/components/crm/ProcessoFilters.tsx` com chip visual de urgência ativa
- Testes unitários e de integração **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [ ] Com `filters.urgencia = true` e lista de 10 processos onde 3 têm `diasRestantes <= 5`, apenas 3 são exibidos
  - [ ] Com `filters.urgencia = false`, todos os processos carregados são exibidos sem filtragem
  - [ ] `urgencia` não aparece nos query params enviados ao backend em nenhum cenário
  - [ ] Chip "Urgência" aparece nos filtros ativos quando `filters.urgencia = true`
- Testes de integração:
  - [ ] Ativar filtro de urgência não dispara nova requisição ao backend
  - [ ] Desativar filtro de urgência restaura a lista completa carregada
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Ativar filtro de urgência exibe apenas processos urgentes da página atual
- Backend não recebe parâmetro `urgencia` em nenhuma requisição do CRM
