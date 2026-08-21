---
status: completed
title: Fix onboarding — sync OAB fire-and-forget
type: bugfix
complexity: low
dependencies: []
---

# Task 05: Fix onboarding — sync OAB fire-and-forget

## Overview
O `Passo2Importacao.tsx` faz `await fetch('/api/processos/sync-djen')`, que é uma chamada síncrona bloqueante que pode demorar 30s+ e travar o botão "Próximo". Esta tarefa substitui a chamada pela rota assíncrona `/api/processos/sync` (retorna 202 imediatamente), permitindo que o usuário avance sem esperar o sync completar.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE salvar OAB (PATCH `/api/users/me`) antes de disparar o sync — ordem preservada
- DEVE chamar `POST /api/processos/sync` sem await para resultado do job (fire-and-forget)
- DEVE habilitar o botão "Próximo" imediatamente após o disparo do sync (não aguardar conclusão)
- DEVE exibir mensagem informativa ao usuário de que a importação está ocorrendo em background
- DEVE manter o botão "Pular" funcional como fallback
- NÃO DEVE chamar `/api/processos/sync-djen` (rota bloqueante) durante o onboarding
</requirements>

## Subtasks
- [x] 5.1 Substituir `fetch('/api/processos/sync-djen')` por `fetch('/api/processos/sync', { method: 'POST' })` no Passo2Importacao
- [x] 5.2 Remover o `await` da chamada de sync — disparar e avançar imediatamente
- [x] 5.3 Atualizar o texto de feedback para indicar que a importação ocorre em background
- [x] 5.4 Garantir que o estado `done` é atingido após o disparo (sem aguardar resposta do job)
- [x] 5.5 Escrever testes para o fluxo com e sem dados OAB preenchidos

## Implementation Details
Arquivo a modificar: `src/components/onboarding/Passo2Importacao.tsx`

Fluxo atual (linhas ~44-64):
1. PATCH `/api/users/me` (await — correto, precisa confirmar o save)
2. POST `/api/processos/sync-djen` (await — bloqueante, até 30s)
3. Exibe total de processos encontrados

Fluxo após o fix:
1. PATCH `/api/users/me` (await — mantido)
2. POST `/api/processos/sync` sem await (fire-and-forget)
3. Avançar para estado `done` imediatamente com mensagem "Importação iniciada em background"

Ver TechSpec > Component Overview para o fluxo de onboarding.

### Relevant Files
- `src/components/onboarding/Passo2Importacao.tsx` — componente a modificar
- `src/app/api/processos/sync/route.ts` — rota assíncrona que emite evento Inngest (retorna 202)
- `src/app/(onboarding)/onboarding/page.tsx` — controla navegação entre passos

### Dependent Files
- `src/app/(onboarding)/onboarding/page.tsx` — pode precisar de ajuste se `Passo2` retornar novo formato de estado

### Related ADRs
Nenhum ADR específico para esta tarefa.

## Deliverables
- `src/components/onboarding/Passo2Importacao.tsx` modificado
- Testes unitários e de integração **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [x] Com OAB preenchido, PATCH `/api/users/me` é chamado antes do sync
  - [x] `POST /api/processos/sync` é disparado sem aguardar resposta do job
  - [x] Estado `done` é atingido imediatamente após o disparo do sync
  - [x] Botão "Próximo" fica habilitado após o disparo (não apenas após conclusão)
  - [x] Com PATCH falhando, sync não é disparado e erro é exibido ao usuário
- Testes de integração:
  - [x] Clicar em "Iniciar importação" chama PATCH e depois POST `/api/processos/sync`; botão "Próximo" fica disponível em menos de 2s
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Botão "Próximo" no onboarding fica disponível em menos de 2s após clicar em importar
- Nenhum timeout ou travamento no fluxo de onboarding
