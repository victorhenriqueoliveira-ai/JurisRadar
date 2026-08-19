---
status: pending
title: Onboarding guiado: fluxo 3 passos e tour interativo
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
  - task_07
---

# Task 18: Onboarding guiado: fluxo 3 passos e tour interativo

## Overview

Implementa o fluxo de onboarding pós-cadastro em 3 passos (dados do escritório → importação de processos → apresentação do dashboard) e o tour interativo opcional de 90 segundos que destaca as seções principais do produto para novos usuários.

<critical>
- SEMPRE LEIA o PRD (seção "Experiência do Usuário — Fluxo Principal: Primeiro Acesso") e o TechSpec (seção "Build Order passo 18") antes de começar
- REFERENCIE O TECHSPEC para o fluxo de onboarding e o papel do `ImportLoader` (task_01)
- FOQUE NO "QUÊ" — experiência de primeiro acesso; a importação real é feita pela task_07
- MINIMIZE CÓDIGO — use um wizard de steps com estado local; para tour use `driver.js` ou equivalente
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar rota `/onboarding` com wizard de 3 passos sem sidebar (layout próprio)
- DEVE implementar Passo 1: formulário de dados do escritório (nome, CNPJ opcional, área de atuação)
- DEVE implementar Passo 2: campo OAB + CPF com botão "Importar meus processos"; exibir `ImportLoader` (task_01) durante importação assíncrona; feedback em tempo real ("Encontramos N processos")
- DEVE implementar Passo 3: preview do dashboard com dados reais importados e botão "Ir para o dashboard"
- DEVE redirecionar para `/onboarding` ao detectar `orgId` ausente no JWT (já feito no middleware da task_03)
- DEVE implementar tour interativo opcional após Passo 3: destacar Dashboard, CRM, Calendário e Notificações em sequência com tooltips explicativos
- DEVE marcar onboarding como concluído em `organizations.onboarding_completed_at` para não exibir novamente
- DEVERIA ser pulável a qualquer momento ("Pular e explorar por conta própria")
</requirements>

## Subtasks

- [ ] 18.1 Criar `src/app/(onboarding)/layout.tsx` sem sidebar e `src/app/(onboarding)/page.tsx` com wizard
- [ ] 18.2 Implementar Passo 1: formulário de dados do escritório com validação
- [ ] 18.3 Implementar Passo 2: campos OAB/CPF, `ImportLoader` e polling de progresso da importação
- [ ] 18.4 Implementar Passo 3: preview do dashboard e marcação de onboarding concluído
- [ ] 18.5 Implementar tour interativo com biblioteca de highlight (ex: `driver.js`)
- [ ] 18.6 Adicionar botão "Pular" em todos os passos e no tour
- [ ] 18.7 Escrever testes do fluxo de wizard e da marcação de conclusão

## Implementation Details

Arquivos a criar:
- `src/app/(onboarding)/layout.tsx` — layout sem sidebar
- `src/app/(onboarding)/page.tsx` — wizard com estado de passo atual
- `src/components/onboarding/Passo1Escritorio.tsx`
- `src/components/onboarding/Passo2Importacao.tsx`
- `src/components/onboarding/Passo3Dashboard.tsx`
- `src/components/onboarding/TourInterativo.tsx`
- `src/app/api/onboarding/complete/route.ts` — PATCH para marcar `onboarding_completed_at`

Arquivos a modificar:
- `src/db/schema.ts` — adicionar `onboarding_completed_at timestamptz` em `organizations`
- `middleware.ts` — verificar `onboarding_completed_at` antes de redirecionar para `/onboarding`

Instalar: `driver.js` para tour interativo (alternativa leve e sem dependências pesadas)

### Relevant Files

- `src/components/ui-custom/ImportLoader.tsx` (task_01) — usado no Passo 2
- `src/app/api/processos/sync/route.ts` (task_07) — chamado no Passo 2 para iniciar importação
- `middleware.ts` (task_03) — redireciona para `/onboarding` quando org sem onboarding completo

### Dependent Files

Nenhum — esta task é folha na árvore de dependências de frontend.

### Related ADRs

Nenhum ADR específico.

## Deliverables

- Wizard de onboarding em 3 passos funcional
- Tour interativo com 4 destaques e tooltips
- Marcação de onboarding concluído persistida no banco
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Wizard inicia no Passo 1; clicar "Próximo" com formulário vazio mostra validação
  - [ ] Wizard no Passo 2 exibe `ImportLoader` após clicar "Importar"; exibe contagem de processos após conclusão
  - [ ] Clicar "Pular" no Passo 2 avança para Passo 3 sem erro
  - [ ] Passo 3 exibe botão "Ir para o dashboard" que navega para `/app/dashboard`
- Testes de integração:
  - [ ] `PATCH /api/onboarding/complete` atualiza `onboarding_completed_at` da organização
  - [ ] Usuário com `onboarding_completed_at` preenchido não é redirecionado para `/onboarding`
  - [ ] Acesso a `/onboarding` com onboarding já concluído redireciona para `/app/dashboard`
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Fluxo completo de onboarding (cadastro → 3 passos → dashboard) em menos de 5 minutos
- Tour pode ser pulado ou encerrado a qualquer momento sem afetar o estado da aplicação
- Onboarding não é exibido novamente após ser concluído
