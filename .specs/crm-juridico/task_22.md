---
status: completed
title: Frontend Calendário — DnD addon, Tooltip hover e modo Foco do dia
type: frontend
complexity: high
dependencies:
  - task_17
  - task_21
---

# Task 22: Frontend Calendário — DnD addon, Tooltip hover e modo Foco do dia

## Overview

Atualiza `CalendarioProcessual.tsx` com os três diferenciais de UX do PRD v2.0: drag-and-drop para reagendar eventos (addon nativo do react-big-calendar), mini-prévia com dados do processo ao passar o mouse (Radix UI Tooltip), e modo "Foco do dia" como checklist com barra de progresso. Estes três recursos são os diferenciais de calendário que separam o JurisRadar dos concorrentes.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- 1. DEVE envolver `Calendar` com `withDragAndDrop(Calendar)` do addon `react-big-calendar/lib/addons/dragAndDrop`.
- 2. `onEventDrop` DEVE chamar `PUT /api/calendario/eventos/[id]` com a nova data; se a API retornar 422 (prazo fatal em data passada), exibir toast de erro com a mensagem da API.
- 3. DEVE implementar Tooltip via Radix UI `Tooltip` no `eventPropGetter` ou componente de evento customizado; o Tooltip abre com delay de 300ms em `onMouseEnter` e fecha no `onMouseLeave` ou no clique.
- 4. O Tooltip DEVE exibir: número CNJ do processo, partes (autor vs. réu), tipo do evento e data/hora.
- 5. DEVE criar componente `FocoDoDia` que consome `GET /api/calendario/foco-do-dia` e exibe checklist de eventos/tarefas do dia com barra de progresso baseada em eventos marcados como concluídos.
- 6. O modo "Foco do dia" DEVE ser acessível via botão na toolbar do calendário.
- 7. DEVE usar a nova assinatura de `resolverEstiloEvento` (task_17) no `eventPropGetter`.
- 8. NÃO DEVE instalar novas dependências além do addon já incluído no react-big-calendar — Radix UI já está no projeto.
</requirements>

## Subtasks

- [x] 22.1 Envolver `Calendar` com `withDragAndDrop` e implementar `onEventDrop` com chamada à API e toast de erro
- [x] 22.2 Implementar Tooltip Radix UI no componente de evento customizado com dados do processo
- [x] 22.3 Criar componente `FocoDoDia` com checklist e barra de progresso
- [x] 22.4 Adicionar botão "Foco do dia" na toolbar do calendário
- [x] 22.5 Atualizar `eventPropGetter` para usar `resolverEstiloEvento` (task_17)
- [x] 22.6 Testar regressão nas visualizações dia, semana e mês

## Implementation Details

Ver seção "ADR-010" do TechSpec v2.0 e "Features Principais — Calendário Diferenciado" do PRD v2.0. O componente principal está em `src/components/calendario/CalendarioProcessual.tsx`.

O addon DnD está em `react-big-calendar/lib/addons/dragAndDrop` — importar `withDragAndDrop` e os estilos `react-big-calendar/lib/addons/dragAndDrop/styles.css`. Radix UI `Tooltip` já é usado em outros componentes do projeto — verificar imports existentes.

### Relevant Files

- `src/components/calendario/CalendarioProcessual.tsx` — componente principal a modificar (≈400 linhas)
- `src/lib/calendario-utils.ts` — `resolverEstiloEvento` atualizado na task_17
- `src/components/calendario/EventoCalendario.tsx` — componente de evento customizado (se existir)
- `src/app/(app)/calendario/page.tsx` — página que renderiza o calendário

### Dependent Files

- Nenhum componente downstream depende diretamente desta task — é o consumidor final

### Related ADRs

- [ADR-010: Drag-and-Drop e Mini-Prévia — Addon react-big-calendar + Tooltip Radix](../adrs/adr-010.md) — decisão de manter react-big-calendar vs migrar para FullCalendar

## Deliverables

- `CalendarioProcessual.tsx` com DnD funcional, Tooltip hover e botão Foco do dia
- Componente `FocoDoDia` com checklist e barra de progresso
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração (render + interação) **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `onEventDrop` com evento de `tipo='prazo_fatal'` e data passada exibe toast com mensagem "Prazo fatal não pode ser movido para data passada."
  - [ ] `onEventDrop` com evento válido chama `PUT /api/calendario/eventos/[id]` com a nova data
  - [ ] Tooltip renderiza com `clienteNome`, `numeroCnj` e `tipo` do evento quando `onMouseEnter` é disparado após 300ms
  - [ ] Tooltip fecha quando `onMouseLeave` é disparado antes dos 300ms (sem render)
  - [ ] `FocoDoDia` com 3 eventos e 1 marcado como concluído exibe barra de progresso em 33%
  - [ ] `FocoDoDia` sem eventos exibe estado vazio com mensagem adequada
- Testes de integração:
  - [ ] Calendário renderiza sem erros com lista de eventos mistos (fonte 'calendario' e 'agenda')
  - [ ] Arrastar evento para nova data dispara PUT e atualiza evento na grade sem reload da página
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- DnD funciona em todas as visualizações (dia, semana, mês)
- Tooltip abre com delay e não interfere com clique no evento
- Modo Foco do dia acessível e exibe checklist correto
- Nenhuma regressão nas visualizações existentes
