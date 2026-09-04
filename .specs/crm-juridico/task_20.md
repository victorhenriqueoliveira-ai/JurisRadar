---
status: completed
title: calendarioAutoEventCreator — Inngest function de auto-criação de eventos via DJE/DJEN
type: backend
complexity: medium
dependencies:
  - task_16
---

# Task 20: calendarioAutoEventCreator — Inngest function de auto-criação de eventos via DJE/DJEN

## Overview

Cria a Inngest function `calendarioAutoEventCreator` que consome o evento `notificacao/nova` já emitido pelo pipeline DJE/DJEN existente e, quando `tipo` for `'intimacao'` ou `'audiencia'`, insere automaticamente um evento em `eventos_calendario` com `origem='djen'`. Esta function fecha a ponte entre o monitoramento e o calendário sem modificar o pipeline existente.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- 1. DEVE criar `src/inngest/calendario-auto-event-creator.ts` como Inngest function que consome `notificacao/nova`.
- 2. DEVE inserir em `eventos_calendario` apenas quando `tipo === 'intimacao' || tipo === 'audiencia'`.
- 3. DEVE definir `origem = 'djen'` no evento criado para distinguir de eventos manuais.
- 4. DEVE ser idempotente: verificar se já existe evento com mesmo `processo_id`, `tipo` e `data` antes de inserir — evitar duplicatas em caso de retry Inngest.
- 5. DEVE extrair `responsavel_id` do processo vinculado (`processos.responsavel_id` ou membro da org) para preencher o campo no evento.
- 6. NÃO DEVE modificar `dje-processo-matcher.ts` ou `notificacao-dispatcher.ts` — apenas consumir o evento existente.
- 7. DEVE registrar a nova function no cliente Inngest do projeto.
</requirements>

## Subtasks

- [ ] 20.1 Criar `src/inngest/calendario-auto-event-creator.ts` consumindo `notificacao/nova`
- [ ] 20.2 Implementar lógica de filtragem por `tipo === 'intimacao' | 'audiencia'`
- [ ] 20.3 Implementar verificação de idempotência antes do INSERT
- [ ] 20.4 Registrar a function no cliente Inngest (`src/inngest/index.ts` ou equivalente)
- [ ] 20.5 Escrever testes com Inngest test helpers

## Implementation Details

Ver seção "System Architecture — Fluxo de dados" e "Build Order — passo 14" do TechSpec v2.0. O evento `notificacao/nova` já é emitido por `dje-processo-matcher.ts` e `notificacao-dispatcher.ts` — verificar o payload exato nesses arquivos antes de implementar.

O campo `responsavel_id` do processo está disponível na tabela `processos` — fazer JOIN ao processar o evento. Usar o padrão de Inngest functions existente no projeto (ver `garantia-intimacao-escalador.ts` como referência de estrutura).

### Relevant Files

- `src/inngest/dje-processo-matcher.ts` — emite `notificacao/nova`; verificar payload
- `src/inngest/notificacao-dispatcher.ts` — também consome `notificacao/nova`; referência de padrão
- `src/inngest/garantia-intimacao-escalador.ts` — referência de estrutura de Inngest function
- `src/db/schema.ts` — tabela `eventos_calendario` com coluna `origem` (task_16)
- `src/inngest/index.ts` — registro de functions Inngest (verificar nome exato do arquivo)

### Dependent Files

- `src/inngest/index.ts` — precisará registrar a nova function
- `src/app/(app)/calendario/page.tsx` — beneficiário indireto (eventos aparecem automaticamente)

### Related ADRs

- [ADR-008: Unificação de Visualização do Calendário — SQL View](../adrs/adr-008.md) — a view `v_eventos_calendario` exibirá os eventos criados por esta function
- [ADR-010: Drag-and-Drop e Mini-Prévia — Addon react-big-calendar + Tooltip Radix](../adrs/adr-010.md) — eventos com `origem='djen'` são editáveis e deletáveis pelo advogado

## Deliverables

- `src/inngest/calendario-auto-event-creator.ts` funcionando e registrado
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração com Inngest test helpers **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Evento `notificacao/nova` com `tipo='intimacao'` resulta em INSERT em `eventos_calendario` com `origem='djen'`
  - [ ] Evento `notificacao/nova` com `tipo='audiencia'` resulta em INSERT em `eventos_calendario` com `tipo='audiencia'`
  - [ ] Evento `notificacao/nova` com `tipo='decisao'` não cria nenhum evento no calendário
  - [ ] Segunda execução com mesmo `processo_id`, `tipo` e `data` não cria registro duplicado (idempotência)
  - [ ] Evento sem `processo_id` válido é descartado sem erro (log estruturado)
- Testes de integração:
  - [ ] Emitir `notificacao/nova` com `tipo='intimacao'` no ambiente Inngest de teste → verificar INSERT em `eventos_calendario` com `origem='djen'` e `responsavel_id` correto
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Evento de intimação detectado pelo DJE/DJEN aparece automaticamente no calendário do advogado responsável
- Sem duplicatas após retries do Inngest
- `dje-processo-matcher.ts` e `notificacao-dispatcher.ts` sem modificações
