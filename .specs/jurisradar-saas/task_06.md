---
status: pending
title: Resend: setup e templates de e-mail base
type: backend
complexity: low
dependencies:
  - task_03
---

# Task 06: Resend: setup e templates de e-mail base

## Overview

Configura o Resend como provedor de e-mail transacional e cria os templates base usando React Email, que serão reutilizados por todas as tasks de notificação subsequentes. Os templates base cobrem: boas-vindas ao onboarding, convite de membro, falha de cobrança e e-mail genérico de sistema.

<critical>
- SEMPRE LEIA o TechSpec (seções "Integration Points — Resend" e "ADR-006") antes de começar
- REFERENCIE O TECHSPEC para a lista de templates prioritários e a estrutura do serviço de e-mail
- FOQUE NO "QUÊ" — setup e templates base; templates de notificação de intimação são da task_12
- MINIMIZE CÓDIGO — use componentes `@react-email/components`; não reinvente layout de e-mail
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE instalar `resend` e `@react-email/components` e criar cliente singleton em `src/lib/email/resend.ts`
- DEVE criar `src/lib/email/send.ts` com função tipada `sendEmail({ to, subject, template })` que encapsula o cliente Resend
- DEVE criar 3 templates React Email em `src/lib/email/templates/`: `WelcomeOnboarding.tsx`, `ConviteMembro.tsx`, `FalhaBilling.tsx`
- DEVE configurar domínio de envio verificado no Resend (DNS: SPF, DKIM, DMARC) — documentar os registros necessários
- DEVERIA ter preview local dos templates via `react-email dev` sem envio real
- NUNCA chamar Resend diretamente de Route Handlers — sempre via Inngest `notificacao-dispatcher` (tasks_11, task_12); esta task apenas cria a infraestrutura
- DEVE expor `renderToHtml(template)` para cada template, permitindo preview e teste sem envio
</requirements>

## Subtasks

- [ ] 6.1 Instalar `resend` e `@react-email/components`; criar `src/lib/email/resend.ts` com cliente singleton
- [ ] 6.2 Criar `src/lib/email/send.ts` com função `sendEmail` tipada e tratamento de erros do Resend
- [ ] 6.3 Criar template `WelcomeOnboarding.tsx` com boas-vindas, nome do usuário e link para o app
- [ ] 6.4 Criar template `ConviteMembro.tsx` com nome do escritório, papel e link de aceitação
- [ ] 6.5 Criar template `FalhaBilling.tsx` com alerta de cobrança falha e link para atualizar cartão
- [ ] 6.6 Documentar registros DNS necessários em `docs/email-setup.md`
- [ ] 6.7 Escrever testes de renderização dos templates

## Implementation Details

Arquivos a criar:
- `src/lib/email/resend.ts` — cliente Resend singleton
- `src/lib/email/send.ts` — função `sendEmail` com tipagem
- `src/lib/email/templates/WelcomeOnboarding.tsx`
- `src/lib/email/templates/ConviteMembro.tsx`
- `src/lib/email/templates/FalhaBilling.tsx`
- `src/lib/email/templates/index.ts` — barrel export
- `docs/email-setup.md` — registros DNS para Resend

Variável de ambiente obrigatória:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (ex: `noreply@jurisradar.com.br`)

### Relevant Files

- `src/lib/system-user.ts` — padrão de singleton existente para inspirar `resend.ts`
- `src/auth.ts` — fonte dos dados de usuário (nome, e-mail) usados nos templates

### Dependent Files

- `src/inngest/notificacao-dispatcher.ts` (task_11) — consumirá `sendEmail` para disparar notificações
- `src/lib/email/templates/NotificacaoIntimacao.tsx` (task_12) — template adicional a criar na task_12

### Related ADRs

- [ADR-006: Resend como Provedor de E-mail Transacional](adrs/adr-006.md) — Justifica Resend + React Email

## Deliverables

- `src/lib/email/resend.ts` e `src/lib/email/send.ts`
- 3 templates React Email renderizáveis
- `docs/email-setup.md` com registros DNS
- Testes de renderização com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `renderToHtml(<WelcomeOnboarding name="João" />)` retorna HTML contendo "João"
  - [ ] `renderToHtml(<ConviteMembro escritorio="Silva & Associados" papel="associado" link="https://..." />)` retorna HTML com nome do escritório e papel
  - [ ] `renderToHtml(<FalhaBilling />)` retorna HTML com texto de alerta de cobrança
  - [ ] `sendEmail` com `RESEND_API_KEY` inválida lança erro tipado sem crash silencioso
- Testes de integração:
  - [ ] `sendEmail` em ambiente de teste (Resend test mode) retorna `{ id: string }` sem erro
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Templates renderizam sem erro com `react-email dev`
- `sendEmail` nunca é chamado diretamente de Route Handlers (verificável por grep)
