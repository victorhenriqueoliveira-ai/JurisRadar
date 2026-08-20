---
status: completed
title: Inngest job de indexação diária (cron)
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
  - task_04
---

# Task 05: Inngest job de indexação diária (cron)

## Overview

Implementa o Inngest function `djeIndexer` com trigger cron (23h UTC / 20h BRT, segunda a sexta) que orquestra o pipeline completo de indexação: verificação de idempotência, download dos cadernos 2 e 3, extração de texto, segmentação de publicações e persistência no banco. Também registra o novo function no serve handler do Inngest.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `src/inngest/dje-indexer.ts` com um Inngest function de `id: 'dje-daily-indexer'` e trigger `{ cron: '0 23 * * 1-5' }` (23h UTC = 20h BRT)
- DEVE implementar os 4 steps sequenciais: `download-caderno-2`, `index-caderno-2`, `download-caderno-3`, `index-caderno-3`
- DEVE verificar idempotência no início: se `dje_editions` já contiver uma entrada com `status: 'completed'` para a data do dia e o caderno, o step correspondente DEVE ser pulado sem reprocessamento
- DEVE criar a entrada em `dje_editions` com status `'downloading'` antes do fetch e atualizar para `'completed'` (com `publication_count`) ou `'failed'` (com `error_message`) ao final de cada caderno
- A falha no processamento de um caderno NÃO DEVE interromper o processamento do outro — cada caderno é tratado de forma independente
- DEVE logar início e fim de cada step com estrutura: `[dje-indexer] step started`, `[dje-indexer] step completed`
- DEVE ser registrado no array de functions em `src/app/api/inngest/route.ts`
- `retries` DEVE ser configurado como `2` (diferente do padrão `0` do projeto) dado que o job diário é crítico e não pode ser reexecutado facilmente
</requirements>

## Subtasks

- [x] 5.1 Criar `src/inngest/dje-indexer.ts` com a estrutura de função Inngest e trigger cron
- [x] 5.2 Implementar o step de verificação de idempotência (consulta `dje_editions` antes de cada download)
- [x] 5.3 Implementar os 4 steps sequenciais usando `downloadCaderno`, `extractTextFromPdf`, `segmentPublications` e `insertPublications`
- [x] 5.4 Implementar tratamento de erro por caderno: falha em um não interrompe o outro, `updateDjeEditionStatus` com `'failed'` e `error_message`
- [x] 5.5 Registrar `djeIndexer` em `src/app/api/inngest/route.ts` no array de functions do `serve`
- [x] 5.6 Testar o job via Inngest Dev Server localmente com trigger manual

## Implementation Details

Referencie a seção "System Architecture" e "Integration Points — Inngest" do TechSpec para a estrutura de steps e configuração de cron.

O padrão de Inngest function do projeto está em `src/inngest/federated-search.ts` — analisar antes de implementar: como steps são declarados, como estado é passado entre steps, como erros são capturados. Nesta feature os steps são sequenciais (não paralelos), o que simplifica o fluxo.

A data do dia para o job é derivada de `new Date().toISOString().split('T')[0]` no início da execução — não recebida como evento (trigger é cron, sem payload).

### Relevant Files

- `src/inngest/dje-indexer.ts` — arquivo a criar
- `src/inngest/client.ts` — importar instância `inngest` existente (não modificar)
- `src/inngest/federated-search.ts` — referência de padrão de Inngest function (não modificar)
- `src/app/api/inngest/route.ts` — adicionar `djeIndexer` ao array de functions
- `src/lib/dje/client.ts` (task_02) — importar `downloadCaderno`
- `src/lib/dje/parser.ts` (task_03) — importar `extractTextFromPdf`, `segmentPublications`
- `src/db/dje.ts` (task_04) — importar `createDjeEdition`, `updateDjeEditionStatus`, `insertPublications`

### Dependent Files

- `src/app/api/inngest/route.ts` — deve importar e registrar `djeIndexer`

### Related ADRs

- [ADR-001: Estratégia de Indexação — Batch Diário com Histórico Persistido](adrs/adr-001.md) — define o modelo de job cron com steps por caderno e persistência de estado em `dje_editions`

## Deliverables

- `src/inngest/dje-indexer.ts` com função `djeIndexer` exportada
- `src/app/api/inngest/route.ts` atualizado com `djeIndexer` registrado
- Testes unitários/integração com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários (mocks de `downloadCaderno`, `extractTextFromPdf`, `segmentPublications`, `insertPublications`):
  - [x] Quando `dje_editions` já tem entrada `completed` para `(data, caderno: 2)`, o step `download-caderno-2` é pulado e `downloadCaderno` não é chamado
  - [x] Quando `downloadCaderno` lança `DjeNotFoundError`, `updateDjeEditionStatus` é chamado com `'failed'` e o step do caderno 3 continua normalmente
  - [x] Quando `segmentPublications` retorna 142 publicações, `insertPublications` é chamado com 142 itens e `updateDjeEditionStatus` é chamado com `publication_count: 142`
  - [x] Falha no step `index-caderno-2` (exception em `insertPublications`) não impede execução do step `download-caderno-3`
  - [x] Logs `[dje-indexer] step started` e `[dje-indexer] step completed` emitidos em cada step (spy em `console.log`)
- Testes de integração:
  - [x] Execução manual via Inngest Dev Server com `downloadCaderno` mockado retornando PDF fixture → `dje_editions` atualizado com `status: 'completed'` e `publication_count > 0` ao final
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Job visível no painel do Inngest Dev Server com trigger cron `0 23 * * 1-5`
- Execução completa de um ciclo (caderno 2 + caderno 3) em menos de 10 minutos com PDFs reais
- `dje_editions` tem duas entradas `completed` (uma por caderno) após execução bem-sucedida
- Falha em um caderno não afeta o outro: se caderno 2 falhar, caderno 3 ainda é processado
