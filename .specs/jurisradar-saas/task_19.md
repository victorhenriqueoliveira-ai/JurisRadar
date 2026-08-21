---
status: completed
title: Stripe Customer Portal e self-service de assinatura
type: backend
complexity: medium
dependencies:
  - task_05
---

# Task 19: Stripe Customer Portal e self-service de assinatura

## Overview

Implementa o portal self-service de assinatura: endpoint de redirecionamento para o Stripe Customer Portal, página de billing com status da assinatura atual e tela de upgrade para usuários em trial prestes a expirar.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 9: Billing e Assinatura") e o TechSpec (seção "Integration Points — Stripe") antes de começar
- REFERENCIE O TECHSPEC para o endpoint `GET /api/billing/portal` e o fluxo de Customer Portal
- FOQUE NO "QUÊ" — portal e página de billing; o checkout já está na task_05
- MINIMIZE CÓDIGO — o Stripe Customer Portal lida com upgrade, cancelamento e faturas; não reimplementar
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar endpoint `GET /api/billing/portal` que gera sessão do Stripe Customer Portal e redireciona o usuário
- DEVE criar página `/configuracoes/billing` com: status da assinatura atual, data de renovação, plano ativo e botão "Gerenciar assinatura" (redireciona para Customer Portal)
- DEVE exibir banner de trial expirando na área `(app)` quando `trial_ends_at < hoje + 4 dias`
- DEVE exibir CTAs de upgrade para usuários em trial expirado na página `/billing` (já criada na task_05)
- DEVERIA exibir histórico de faturas (obtido do Customer Portal via Stripe — não requer armazenamento próprio)
</requirements>

## Subtasks

- [x] 19.1 Criar `GET /api/billing/portal` com geração de sessão Stripe Customer Portal
- [x] 19.2 Criar página `/configuracoes/billing` com dados de assinatura e botão de portal
- [x] 19.3 Criar componente `TrialBanner` exibido no layout quando trial expira em ≤ 4 dias
- [x] 19.4 Integrar `TrialBanner` no `AppHeader` ou layout `(app)`
- [x] 19.5 Escrever testes do endpoint e do banner

## Implementation Details

Arquivos a criar:
- `src/app/api/billing/portal/route.ts` — GET redirecionamento para Customer Portal
- `src/app/(app)/configuracoes/billing/page.tsx` — página de billing
- `src/components/billing/TrialBanner.tsx` — banner de trial expirando

Arquivos a modificar:
- `src/app/(app)/layout.tsx` (task_04) — adicionar `TrialBanner` condicionalmente

### Relevant Files

- `src/lib/stripe.ts` (task_05) — cliente Stripe singleton
- `src/db/schema.ts` (task_02) — tabela `subscriptions` com `trial_ends_at`, `status`, `plan`
- `src/auth.ts` (task_03) — `subscriptionStatus` no JWT para verificação no banner

### Dependent Files

Nenhum — esta task é folha na árvore de dependências.

### Related ADRs

- [ADR-003: Stripe como Gateway de Billing e Assinaturas](adrs/adr-003.md) — Customer Portal elimina necessidade de construir portal próprio

## Deliverables

- `GET /api/billing/portal` funcional
- Página `/configuracoes/billing` com status e botão
- `TrialBanner` integrado ao layout
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `TrialBanner` com `trial_ends_at = hoje + 3` renderiza com texto "3 dias restantes"
  - [x] `TrialBanner` com `trial_ends_at = hoje + 5` não renderiza (fora da janela de alerta)
  - [x] `TrialBanner` com `status = 'active'` não renderiza (não é trial)
- Testes de integração:
  - [x] `GET /api/billing/portal` sem autenticação retorna 401
  - [x] `GET /api/billing/portal` com org sem `stripe_customer_id` retorna 400 com mensagem clara
  - [x] `GET /api/billing/portal` com cliente Stripe válido redireciona para URL do Customer Portal
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Clicar "Gerenciar assinatura" redireciona para Customer Portal do Stripe em menos de 1s
- Banner de trial aparece exatamente quando `trial_ends_at < hoje + 4` dias
- Página de billing exibe plano atual e data de renovação corretamente
