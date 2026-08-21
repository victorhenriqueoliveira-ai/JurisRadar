---
status: completed
title: Ajustar cron Inngest OAB para 5h
type: infra
complexity: low
dependencies: []
---

# Task 11: Ajustar cron Inngest OAB para 5h

## Overview
O scheduler Inngest de sync OAB roda diariamente às 6h UTC (`0 6 * * *`). Esta tarefa altera a expressão cron para `0 */5 * * *`, fazendo a sincronização rodar a cada 5 horas, mantendo todos os outros comportamentos do scheduler intactos.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE alterar a expressão cron de `'0 6 * * *'` para `'0 */5 * * *'` no scheduler
- NÃO DEVE alterar nenhum outro comportamento do scheduler (fan-out, filtro de subscriptions, emissão de eventos)
- DEVE verificar que o rate limit do worker (`10 processos/s`) continua adequado para a frequência de 5h
- DEVE documentar em comentário no arquivo que o intervalo é configurável se necessário no futuro
</requirements>

## Subtasks
- [x] 11.1 Alterar string cron em `sync-processos-scheduler.ts` de `'0 6 * * *'` para `'0 */5 * * *'`
- [x] 11.2 Adicionar comentário explicativo sobre o intervalo e o horário de início
- [ ] 11.3 Verificar no dashboard do Inngest (após deploy) que o novo cron está registrado corretamente
- [x] 11.4 Escrever teste confirmando a string cron correta

## Implementation Details
Arquivo a modificar: `src/inngest/sync-processos-scheduler.ts`

Linha ~23: `cron: '0 6 * * *'` → `cron: '0 */5 * * *'`

A expressão `0 */5 * * *` roda a cada 5 horas nos minutos 0 das horas 0, 5, 10, 15, 20 (UTC).

Ver TechSpec > System Architecture > Component Overview para o diagrama do fluxo Inngest.

### Relevant Files
- `src/inngest/sync-processos-scheduler.ts` — arquivo a modificar
- `src/inngest/sync-processos-worker.ts` — worker consumidor (não muda, verificar rate limit)

### Dependent Files
Nenhum arquivo depende diretamente desta tarefa.

### Related ADRs
Nenhum ADR específico para esta tarefa.

## Deliverables
- `src/inngest/sync-processos-scheduler.ts` com cron atualizado
- Teste confirmando a expressão cron **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [x] A expressão cron do scheduler é `'0 */5 * * *'`
  - [x] O scheduler ainda emite `processos/sync.requested` por advogado (comportamento mantido)
  - [x] O scheduler ainda filtra apenas orgs com subscription `'trialing'` ou `'active'`
- Testes de integração:
  - [ ] (Manual) Verificar no dashboard Inngest após deploy que o job aparece com o novo schedule
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Sync OAB roda automaticamente a cada 5 horas (verificável no dashboard Inngest)
- Nenhuma regressão no comportamento de fan-out e rate limiting
