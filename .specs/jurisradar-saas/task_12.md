---
status: pending
title: Templates de e-mail de notificação via Resend
type: backend
complexity: medium
dependencies:
  - task_06
  - task_11
---

# Task 12: Templates de e-mail de notificação via Resend

## Overview

Cria os templates React Email específicos de notificação processual (intimação, alerta de prazo, resumo diário) que serão usados pelo dispatcher da task_11. Complementa os templates base da task_06 com os templates de maior volume e impacto do produto.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 4: Notificações") e o TechSpec (seção "Integration Points — Resend") antes de começar
- REFERENCIE O TECHSPEC para a lista de templates e o padrão de `renderToHtml` estabelecido na task_06
- FOQUE NO "QUÊ" — templates de e-mail; o dispatch já está na task_11
- MINIMIZE CÓDIGO — use `@react-email/components` e siga o padrão dos templates da task_06
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar template `NotificacaoIntimacao.tsx` com: nome do processo, número CNJ, tribunal, descrição da intimação, prazo calculado (se disponível) e link direto para o processo no CRM
- DEVE criar template `AlertaPrazo.tsx` com: nome do processo, número CNJ, data do prazo, dias restantes (destacado em vermelho se ≤ 2 dias) e link para o calendário
- DEVE criar template `ResumoDiario.tsx` com: sumário de movimentações do dia, lista de prazos próximos (próximos 7 dias) e total de intimações não lidas — enviado uma vez ao dia se habilitado pelo usuário
- TODOS os templates DEVEM exportar `renderToHtml()` para preview e teste sem envio real
- TODOS os templates DEVEM usar tokens de cor `--jr-*` via style inline (React Email não suporta CSS variables; usar constantes derivadas dos tokens)
- DEVERIA ter preview funcional via `react-email dev` para cada template
</requirements>

## Subtasks

- [ ] 12.1 Criar `src/lib/email/templates/NotificacaoIntimacao.tsx` com props tipadas e layout profissional
- [ ] 12.2 Criar `src/lib/email/templates/AlertaPrazo.tsx` com destaque de urgência por cor
- [ ] 12.3 Criar `src/lib/email/templates/ResumoDiario.tsx` com sumário e lista de prazos
- [ ] 12.4 Atualizar barrel export em `src/lib/email/templates/index.ts`
- [ ] 12.5 Integrar templates no `notificacao-dispatcher` (task_11) mapeando tipo de evento ao template
- [ ] 12.6 Escrever testes de renderização com dados reais

## Implementation Details

Arquivos a criar:
- `src/lib/email/templates/NotificacaoIntimacao.tsx`
- `src/lib/email/templates/AlertaPrazo.tsx`
- `src/lib/email/templates/ResumoDiario.tsx`

Arquivos a modificar:
- `src/lib/email/templates/index.ts` (task_06) — adicionar novos exports
- `src/inngest/notificacao-dispatcher.ts` (task_11) — mapear `tipo` de evento ao template correto

Atenção: React Email usa `style` inline com valores literais (não CSS variables). Criar `src/lib/email/theme.ts` com constantes de cor derivadas dos tokens:
```ts
export const emailTheme = { primary: '#1e3a5f', accent: '#b8860b', danger: '#dc2626' }
```

### Relevant Files

- `src/lib/email/templates/WelcomeOnboarding.tsx` (task_06) — seguir o padrão de estrutura e props
- `src/lib/email/send.ts` (task_06) — função `sendEmail` usada pelo dispatcher
- `src/inngest/notificacao-dispatcher.ts` (task_11) — consumirá os templates desta task

### Dependent Files

- `src/inngest/alertas-prazo.ts` (task_15) — usará `AlertaPrazo.tsx` para enviar alertas de prazo

### Related ADRs

- [ADR-006: Resend como Provedor de E-mail Transacional](adrs/adr-006.md) — padrão React Email

## Deliverables

- 3 templates React Email renderizáveis e integrados ao dispatcher
- `src/lib/email/theme.ts` com constantes de cor para e-mails
- Testes de renderização com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `renderToHtml(<NotificacaoIntimacao processo="0001234-12.2024.8.26.0100" descricao="Intimação para apresentar réplica" prazo="2026-09-05" link="https://..." />)` retorna HTML com número do processo e data do prazo
  - [ ] `renderToHtml(<AlertaPrazo diasRestantes={1} />)` retorna HTML com cor vermelha no elemento de dias restantes
  - [ ] `renderToHtml(<AlertaPrazo diasRestantes={7} />)` retorna HTML sem cor vermelha (prazo não urgente)
  - [ ] `renderToHtml(<ResumoDiario movimentacoes={[]} prazos={[]} intimacoesNaoLidas={0} />)` renderiza sem erro com listas vazias
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Templates renderizam sem erro via `react-email dev`
- `NotificacaoIntimacao` exibe link direto para o processo no CRM
- `AlertaPrazo` com `diasRestantes ≤ 2` exibe destaque visual de urgência
