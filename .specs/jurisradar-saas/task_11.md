---
status: completed
title: Worker de diff de movimentações e dispatch de notificações
type: backend
complexity: high
dependencies:
  - task_07
  - task_10
---

# Task 11: Worker de diff de movimentações e dispatch de notificações

## Overview

Implementa o coração do sistema de alertas: função Inngest `notificacao-dispatcher` que compara movimentações novas com as já persistidas, identifica eventos relevantes (intimações, decisões, sentenças) e emite notificações in-app e e-mails. Esta task fecha o ciclo monitoramento → notificação.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 4: Monitoramento e Notificações") e o TechSpec (seção "Fluxo de dados — sync de processos") antes de começar
- REFERENCIE O TECHSPEC para os tipos de evento que geram notificação e a função `notificacao-dispatcher`
- FOQUE NO "QUÊ" — diff e dispatch; os templates de e-mail são da task_12
- MINIMIZE CÓDIGO — reutilize a tabela `notificacoes` criada na task_10; não reimplemente persistência
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar função Inngest `notificacao-dispatcher` que consome evento `notificacao/nova`
- DEVE persistir registro em `notificacoes` (in-app) para cada evento relevante
- DEVE chamar Resend para enviar e-mail de notificação se o usuário não optou por desativar e-mails daquele tipo
- DEVE respeitar preferências de notificação por advogado (campo `notification_prefs` em `users` ou tabela separada)
- DEVE criar função Inngest `sync-movimentacoes-diff` em `sync-processos-worker.ts` (expandir task_07): após persistir movimentações novas, emitir `notificacao/nova` para cada movimentação do tipo relevante
- Tipos de evento que DEVEM gerar notificação: `intimacao`, `citacao`, `decisao`, `sentenca`, `publicacao_dje`
- DEVE garantir idempotência: mesma movimentação não gera duas notificações (verificar por `movimentacao_id` em `notificacoes`)
- NUNCA enviar e-mail de notificação de forma síncrona dentro do request — sempre via Inngest step
</requirements>

## Subtasks

- [x] 11.1 Criar função `notificacao-dispatcher` em `src/inngest/notificacao-dispatcher.ts`
- [x] 11.2 Implementar step de persistência de notificação in-app com verificação de idempotência
- [x] 11.3 Implementar step de envio de e-mail via Resend respeitando preferências do usuário
- [x] 11.4 Expandir `sync-processos-worker` (task_07) para emitir `notificacao/nova` por movimentação relevante
- [x] 11.5 Criar modelo de preferências de notificação por usuário (tabela ou coluna JSON em `users`)
- [x] 11.6 Registrar nova função no cliente Inngest
- [x] 11.7 Escrever testes com mocks do Inngest e Resend

## Implementation Details

Arquivos a criar:
- `src/inngest/notificacao-dispatcher.ts` — função Inngest que processa `notificacao/nova`
- `src/lib/notificacoes/preferencias.ts` — helper para ler preferências de notificação do usuário

Arquivos a modificar:
- `src/inngest/sync-processos-worker.ts` (task_07) — adicionar step de emit `notificacao/nova` após diff
- `src/db/schema.ts` (task_02) — adicionar coluna `notification_prefs jsonb` em `users` ou criar tabela `user_notification_prefs`

Veja a seção "Fluxo de dados — sync de processos" do TechSpec para o diagrama completo do pipeline monitoramento → notificação.

### Relevant Files

- `src/inngest/sync-processos-worker.ts` (task_07) — emitirá `notificacao/nova`; expandir aqui
- `src/db/schema.ts` (task_02) — tabela `notificacoes` criada na task_10
- `src/lib/email/send.ts` (task_06) — função `sendEmail` a ser chamada pelo dispatcher
- `src/lib/email/templates/` (task_06) — templates base disponíveis; templates de notificação na task_12

### Dependent Files

- `src/lib/email/templates/NotificacaoIntimacao.tsx` (task_12) — template específico de notificação criado na task_12
- `src/app/(app)/configuracoes/notificacoes/page.tsx` (task_20) — UI de preferências de notificação

### Related ADRs

- [ADR-005: Inngest para Worker de Monitoramento de Processos](adrs/adr-005.md) — estrutura de funções e estratégia de retry
- [ADR-006: Resend como Provedor de E-mail Transacional](adrs/adr-006.md) — dispatch de e-mail via Resend

## Deliverables

- `src/inngest/notificacao-dispatcher.ts` com persistência in-app + dispatch e-mail
- `sync-processos-worker` expandido com emit de `notificacao/nova`
- Modelo de preferências de notificação
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `notificacao-dispatcher` com movimentação tipo `intimacao` cria registro em `notificacoes` com `tipo: 'intimacao'`
  - [x] `notificacao-dispatcher` com mesma `movimentacao_id` processada duas vezes cria apenas 1 registro em `notificacoes`
  - [x] `notificacao-dispatcher` com usuário com e-mail desativado para `intimacao` persiste in-app mas não chama Resend
  - [x] Movimentação tipo `despacho_simples` (não está na lista de relevantes) não gera notificação
- Testes de integração:
  - [ ] Pipeline completo com mock DataJud: sync detecta nova intimação → `notificacao/nova` emitido → notificação in-app criada → e-mail enviado (mock Resend)
  - [ ] `GET /api/notificacoes/count` retorna 1 após pipeline de sync com 1 intimação nova
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Mesma movimentação nunca gera duas notificações (idempotência verificada em teste)
- E-mail de notificação nunca é enviado de forma síncrona em um request
- Preferências de notificação são respeitadas: usuário com e-mail desativado não recebe e-mail
