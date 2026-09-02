---
status: completed
title: Frontend — Botão Confirmar Ciência e indicador de garantia
type: frontend
complexity: medium
dependencies:
  - task_11
---

# Task 14: Frontend — Botão Confirmar Ciência e indicador de garantia

## Overview

Adiciona o botão "Confirmar ciência" nas notificações críticas e um indicador visual do estado da garantia (qual etapa do protocolo está ativa). Consome os endpoints `POST /api/notificacoes/[id]/confirmar` e `GET /api/notificacoes/[id]/garantia`.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "API Endpoints — Garantia de Intimação" para os contratos e a seção "Fluxo de dados — Garantia de Intimação" para os estados possíveis
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar botão "Confirmar ciência" apenas em notificações do tipo crítico (`intimacao`, `citacao`, `prazo_fatal`, `decisao`, `sentenca`)
- DEVE exibir o botão como desabilitado e com label "Ciência confirmada" após confirmação bem-sucedida
- DEVE chamar `POST /api/notificacoes/[id]/confirmar` ao clicar e exibir feedback de sucesso
- DEVE implementar `GarantiaStatusIndicator` que mostra o passo atual: `email_enviado` (azul), `sms_whatsapp_enviado` (laranja — urgente), `backup_notificado` (vermelho — crítico), `confirmado` (verde)
- DEVE exibir `GarantiaStatusIndicator` no painel de notificações para intimações críticas não confirmadas
- DEVE atualizar o estado visual imediatamente após confirmação sem reload de página (optimistic update)
- NÃO DEVE exibir o botão para notificações já confirmadas (`confirmado_em != null`)
</requirements>

## Subtasks

- [x] 14.1 Criar `src/components/notificacoes/ConfirmarCienciaButton.tsx`
- [x] 14.2 Criar `src/components/notificacoes/GarantiaStatusIndicator.tsx`
- [x] 14.3 Integrar os dois componentes no painel de notificações existente

## Implementation Details

O painel de notificações existente deve estar em `src/components/` — localizar o componente de sino/lista de notificações e adicionar o botão e o indicador condicionalmente.

O `GarantiaStatusIndicator` deve consumir `GET /api/notificacoes/[id]/garantia` via `useEffect` na montagem e exibir o passo atual como badge ou ícone colorido.

Após confirmação (`POST /confirmar`), fazer optimistic update setando `confirmadoEm = new Date()` no estado local antes da resposta do servidor.

### Relevant Files

- Componente de sino/lista de notificações existente em `src/components/`
- `src/app/api/notificacoes/[id]/confirmar/route.ts` — task_11
- `src/app/api/notificacoes/[id]/garantia/route.ts` — task_11

### Dependent Files

- Nenhum componente downstream depende deste

### Related ADRs

- [ADR-006: Confirmação de Leitura de Intimação — Botão Explícito](../adrs/adr-006.md) — Justifica a UX de botão explícito em vez de pixel de rastreamento

## Deliverables

- `src/components/notificacoes/ConfirmarCienciaButton.tsx`
- `src/components/notificacoes/GarantiaStatusIndicator.tsx`
- Painel de notificações atualizado com os dois componentes
- Testes de componente com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes de componente (React Testing Library):
  - [x] `ConfirmarCienciaButton` com `tipo = 'intimacao'` e `confirmadoEm = null` exibe botão ativo "Confirmar ciência"
  - [x] `ConfirmarCienciaButton` com `confirmadoEm != null` exibe botão desabilitado "Ciência confirmada"
  - [x] `ConfirmarCienciaButton` com `tipo = 'nova_movimentacao'` não renderiza nada
  - [x] Clique no botão chama `POST /api/notificacoes/[id]/confirmar` e aplica optimistic update
  - [x] `GarantiaStatusIndicator` com `step = 'sms_whatsapp_enviado'` exibe badge laranja com texto de urgência
  - [x] `GarantiaStatusIndicator` com `step = 'confirmado'` exibe badge verde
  - [x] `GarantiaStatusIndicator` com `step = 'backup_notificado'` exibe badge vermelho

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Botão não aparece em notificações não críticas
- Botão desabilita imediatamente ao clique (sem dupla confirmação)
- Indicador de garantia reflete o step correto sem reload de página
