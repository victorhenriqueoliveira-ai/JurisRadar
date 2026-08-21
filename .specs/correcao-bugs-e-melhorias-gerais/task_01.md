---
status: completed
title: Fix sort dinâmico em listProcessos()
type: bugfix
complexity: low
dependencies: []
---

# Task 01: Fix sort dinâmico em `listProcessos()`

## Overview
A função `listProcessos()` em `src/services/processos.ts` sempre ordena por `desc(createdAt)`, ignorando os parâmetros `sort` e `order` recebidos. Esta tarefa implementa ordenação dinâmica com whitelist de colunas seguras, corrigindo a causa raiz da ordenação quebrada no CRM.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE aceitar `sort?: SortableColumn` e `order?: 'asc' | 'desc'` na interface `ProcessoFilters` (ver TechSpec > Core Interfaces)
- DEVE validar `sort` contra whitelist: `numeroCnj`, `tribunal`, `areaDireito`, `status`, `ultimaMovimentacao`, `createdAt`
- DEVE usar `desc(processos.createdAt)` como fallback quando `sort` for ausente, inválido ou apontar para campo inexistente na tabela
- NÃO DEVE aceitar valores arbitrários de `sort` — prevenir SQL injection via Drizzle column map
- DEVE respeitar `order: 'asc' | 'desc'` com default `'desc'` quando ausente
</requirements>

## Subtasks
- [x] 1.1 Adicionar tipos `SortableColumn` e campos `sort`/`order` à interface `ProcessoFilters`
- [x] 1.2 Criar mapa de coluna: `Record<SortableColumn, Column>` com as referências Drizzle
- [x] 1.3 Substituir `orderBy(desc(processos.createdAt))` por expressão dinâmica usando o mapa
- [x] 1.4 Escrever testes unitários para os casos de sort válido, inválido e ausente

## Implementation Details
Arquivo a modificar: `src/services/processos.ts`

A query Drizzle usa `.orderBy(desc(processos.createdAt))` fixo na linha ~89. Substituir por:
```ts
// Área problemática atual:
.orderBy(desc(processos.createdAt))

// Novo comportamento esperado — ver TechSpec > Core Interfaces para tipagem completa
```

Referencie a seção "Core Interfaces" do TechSpec para a assinatura exata de `ProcessoFilters` e a whitelist de colunas.

### Relevant Files
- `src/services/processos.ts` — contém `listProcessos()` e a query a corrigir
- `src/db/schema.ts` — definições das colunas Drizzle usadas no mapa

### Dependent Files
- `src/app/api/processos/route.ts` — chama `listProcessos()` com os filtros; task_02 o adapta
- `src/components/crm/ProcessoTable.tsx` — envia o `sort` field que agora será respeitado

### Related ADRs
- [ADR-002: Cálculo de proximoPrazo e Filtro de Urgência no CRM](adrs/adr-002.md) — define que `proximoPrazo` e `responsavelNome` ficam fora da whitelist de sort do backend

## Deliverables
- `src/services/processos.ts` modificado com sort dinâmico e whitelist
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [x] `listProcessos()` com `sort='tribunal'` e `order='asc'` retorna rows ordenadas por `tribunal` ASC
  - [x] `listProcessos()` com `sort='status'` e `order='desc'` retorna rows ordenadas por `status` DESC
  - [x] `listProcessos()` com `sort='proximoPrazo'` (fora da whitelist) faz fallback para `desc(createdAt)`
  - [x] `listProcessos()` com `sort` ausente usa `desc(createdAt)` como default
  - [x] `listProcessos()` com `order` ausente usa `'desc'` como default
  - [x] `listProcessos()` com string arbitrária em `sort` (ex.: `'; DROP TABLE'`) faz fallback seguro
- Testes de integração:
  - [ ] Query com `sort='numeroCnj'&order='asc'` retorna registros em ordem crescente de `numeroCnj` no banco real
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- `listProcessos()` nunca aceita coluna fora da whitelist
- Ordenação da tabela CRM reflete o `sort` selecionado pelo usuário após task_02
