---
status: pending
title: Fix rota GET /api/processos — repassar sort/order
type: bugfix
complexity: low
dependencies:
  - task_01
---

# Task 02: Fix rota `GET /api/processos` — repassar sort/order

## Overview
A rota `GET /api/processos` lê os query params `sort` e `order` do request mas não os repassa ao `listProcessos()`. Esta tarefa extrai esses params e os inclui no objeto `filters` passado ao service, completando o pipeline de ordenação iniciado em task_01.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE extrair `sort` e `order` de `searchParams` e incluí-los no objeto `filters` passado a `listProcessos()`
- DEVE manter todos os demais params (`status`, `area`, `tribunal`, `responsavel_id`, `q`, `cursor`, `limit`) intactos
- NÃO DEVE repassar `urgencia` ao service (filtro de urgência é tratado no frontend conforme ADR-002)
- DEVE retornar os mesmos códigos de status e formato de resposta já existentes
</requirements>

## Subtasks
- [ ] 2.1 Extrair `sort` e `order` de `searchParams` na rota
- [ ] 2.2 Incluir `sort` e `order` no objeto `filters` passado a `listProcessos()`
- [ ] 2.3 Remover (ou não incluir) `urgencia` do objeto `filters`
- [ ] 2.4 Escrever testes de integração para a rota com os novos params

## Implementation Details
Arquivo a modificar: `src/app/api/processos/route.ts`

Ver TechSpec > API Endpoints > "MODIFICADO — GET /api/processos" para a tabela de parâmetros e comportamento esperado.

### Relevant Files
- `src/app/api/processos/route.ts` — rota a modificar
- `src/services/processos.ts` — service que agora aceita `sort`/`order` (task_01)

### Dependent Files
- `src/app/(app)/crm/page.tsx` — constrói a URL com `sort` e `order`; passa a funcionar após esta task
- `src/components/crm/ProcessoTable.tsx` — exibe resultados ordenados

### Related ADRs
- [ADR-002: Cálculo de proximoPrazo e Filtro de Urgência no CRM](adrs/adr-002.md) — confirma que `urgencia` não deve ser repassado ao service

## Deliverables
- `src/app/api/processos/route.ts` modificado
- Testes de integração cobrindo sort e order **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [ ] Handler extrai `sort='tribunal'` e `order='asc'` de `searchParams` e os inclui em `filters`
  - [ ] Handler com `sort` ausente passa `undefined` para `listProcessos()` (fallback fica no service)
  - [ ] Handler não inclui `urgencia` no objeto `filters`
- Testes de integração:
  - [ ] `GET /api/processos?sort=tribunal&order=asc` retorna 200 com processos ordenados por tribunal ASC
  - [ ] `GET /api/processos?sort=invalido&order=asc` retorna 200 com fallback para `createdAt DESC`
  - [ ] `GET /api/processos?urgencia=1` retorna 200 sem diferença de resultado (urgência ignorada no backend)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Clicar em cabeçalho de coluna no CRM altera a ordenação dos resultados
