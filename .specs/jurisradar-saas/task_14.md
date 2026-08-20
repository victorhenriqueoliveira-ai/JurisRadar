---
status: pending
title: Calendário processual: UI, API de eventos e export iCal
type: frontend
complexity: high
dependencies:
  - task_04
  - task_08
  - task_11
---

# Task 14: Calendário processual: UI, API de eventos e export iCal

## Overview

Implementa o calendário processual com visualizações mensal, semanal e agenda, cores por tipo de evento (prazo fatal, audiência, intimação), clique para abrir o processo no CRM e export em formato iCal. Os eventos são derivados das movimentações sincronizadas e dos campos de `eventos_calendario`.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 6: Calendário Processual") e o TechSpec (seção "API Endpoints — Calendário") antes de começar
- REFERENCIE O TECHSPEC para a tabela `eventos_calendario` e os endpoints `/api/calendario`
- FOQUE NO "QUÊ" — visualização do calendário e export iCal; os alertas de prazo são da task_15
- MINIMIZE CÓDIGO — use uma biblioteca de calendário React (ex: `react-big-calendar` ou `@fullcalendar/react`) em vez de construir do zero
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE implementar `GET /api/calendario?de=YYYY-MM-DD&ate=YYYY-MM-DD` retornando eventos processuais do período para o org do usuário
- DEVE implementar `GET /api/calendario/export.ics` gerando arquivo iCal válido (RFC 5545) com todos os eventos do mês corrente
- DEVE renderizar calendário com visualizações: mensal, semanal e agenda (lista)
- DEVE colorir eventos por tipo: vermelho (#dc2626) para prazo fatal ≤ 2 dias, laranja (#ea580c) para prazo 3–7 dias, azul (#2563eb) para audiência, cinza (#6b7280) para prazo > 7 dias, roxo (#7c3aed) para intimação sem prazo
- DEVE abrir painel lateral com detalhes do processo ao clicar num evento
- DEVE funcionar em mobile com swipe horizontal entre semanas (gesture via touch events)
- DEVERIA exibir badge de contagem de eventos por dia na visualização mensal
</requirements>

## Subtasks

- [ ] 14.1 Criar `GET /api/calendario` e `GET /api/calendario/export.ics`
- [ ] 14.2 Criar `src/services/calendario.ts` com query de eventos por período e geração de iCal
- [ ] 14.3 Instalar e configurar biblioteca de calendário React; criar componente `CalendarioProcessual`
- [ ] 14.4 Implementar coloração de eventos por tipo e urgência
- [ ] 14.5 Implementar clique em evento para abrir painel lateral do processo (reutilizar `ProcessoSheet` da task_09)
- [ ] 14.6 Implementar swipe horizontal entre semanas/meses no mobile
- [ ] 14.7 Escrever testes de renderização e de geração do iCal

## Implementation Details

Arquivos a criar:
- `src/app/api/calendario/route.ts` — GET eventos por período
- `src/app/api/calendario/export.ics/route.ts` — GET export iCal
- `src/services/calendario.ts` — queries e geração de string iCal
- `src/components/calendario/CalendarioProcessual.tsx` — componente principal
- `src/components/calendario/EventoCalendario.tsx` — renderização de evento com cor por tipo
- `src/app/(app)/calendario/page.tsx` — página (substituir placeholder da task_04)

Instalar: `ical-generator` (para geração RFC 5545) ou implementar string iCal manualmente (mais simples para v1.0)

### Relevant Files

- `src/db/schema.ts` (task_02) — tabela `eventos_calendario` com `tipo`, `data`, `processo_id`
- `src/components/crm/ProcessoSheet.tsx` (task_09) — reutilizar para exibir detalhe ao clicar no evento
- `src/lib/org-context.ts` (task_03) — `requireOrgContext()` nos endpoints

### Dependent Files

- `src/inngest/alertas-prazo.ts` (task_15) — lê `eventos_calendario` para determinar quais alertas enviar

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — eventos filtrados por `org_id`

## Deliverables

- `GET /api/calendario` e `GET /api/calendario/export.ics` funcionais
- `CalendarioProcessual` com 3 visualizações e coloração por urgência
- Export iCal válido abrindo no Google Calendar
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `gerarIcal([{ titulo: 'Prazo petição', data: '2026-09-01', processoId: 'X' }])` retorna string com `BEGIN:VCALENDAR` e `DTSTART:20260901`
  - [ ] `EventoCalendario` com `tipo='prazo_fatal'` e `data` ≤ 2 dias aplica classe de cor vermelha
  - [ ] `EventoCalendario` com `tipo='audiencia'` aplica classe de cor azul independentemente da data
  - [ ] `CalendarioProcessual` com lista vazia de eventos renderiza calendário sem erros
- Testes de integração:
  - [ ] `GET /api/calendario?de=2026-09-01&ate=2026-09-30` retorna apenas eventos do org do usuário autenticado
  - [ ] `GET /api/calendario/export.ics` retorna `Content-Type: text/calendar` e string iCal válida
  - [ ] Clicar num evento no calendário abre `ProcessoSheet` com dados do processo correto
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Export `.ics` abre corretamente no Google Calendar com eventos nos dias corretos
- Swipe funciona em dispositivo móvel real (ou emulador de touch)
- Eventos coloridos conforme urgência do prazo
