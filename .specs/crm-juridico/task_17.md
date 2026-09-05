---
status: completed
title: Atualizar resolverCorEvento — modelo híbrido tipo + urgência
type: backend
complexity: low
dependencies: []
---

# Task 17: Atualizar resolverCorEvento — modelo híbrido tipo + urgência

## Overview

Refatora a função `resolverCorEvento` em `src/lib/calendario-utils.ts` para adotar o modelo híbrido definido no PRD v2.0: a cor base do evento é determinada pelo tipo (audiência, intimação, tarefa, lembrete), e a intensidade/borda varia com a urgência. Isso é o alicerce visual do calendário diferenciado.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- 1. DEVE retornar cor base por tipo: audiência=azul (#2563eb), intimação=laranja (#ea580c), prazo_fatal=vermelho (#dc2626), tarefa=verde (#16a34a), lembrete=amarelo (#ca8a04), outro/default=cinza (#6b7280).
- 2. DEVE retornar um objeto com `backgroundColor` e `borderWidth` (ou equivalente) para que o componente de calendário aplique a intensidade visual de urgência.
- 3. Eventos com ≤2 dias devem ter cor mais saturada e borda mais espessa; eventos com >7 dias devem ter opacidade ou saturação reduzida — sem mudar a cor base do tipo.
- 4. NÃO DEVE quebrar a assinatura pública atual da função — se a assinatura atual for incompatível, criar função nova `resolverEstiloEvento` e deprecar a antiga.
- 5. DEVE ter testes unitários cobrindo todos os tipos de evento e todas as faixas de urgência.
</requirements>

## Subtasks

- [x] 17.1 Mapear todos os tipos de evento existentes no projeto e definir a paleta de cores por tipo
- [x] 17.2 Refatorar `resolverCorEvento` (ou criar `resolverEstiloEvento`) com modelo tipo + urgência
- [x] 17.3 Atualizar os testes unitários existentes para a nova assinatura/retorno
- [x] 17.4 Verificar todos os locais que chamam a função e atualizar se necessário

## Implementation Details

Ver seção "ADR-010" e a descrição de "Cores híbridas" no TechSpec v2.0. A função atual está em `src/lib/calendario-utils.ts` e é chamada em `src/components/calendario/CalendarioProcessual.tsx` via `eventPropGetter`.

O retorno deve ser compatível com o que `react-big-calendar` espera no `eventPropGetter`: `{ style: { backgroundColor, borderLeft, opacity } }`.

### Relevant Files

- `src/lib/calendario-utils.ts` — arquivo principal a modificar
- `src/components/calendario/CalendarioProcessual.tsx` — chama a função via `eventPropGetter`
- `src/lib/__tests__/` ou `src/lib/calendario-utils.test.ts` — testes existentes (verificar localização exata)

### Dependent Files

- `src/components/calendario/CalendarioProcessual.tsx` — consumidor direto da função; task_22 depende do estilo correto
- `src/app/(app)/calendario/page.tsx` — renderiza o componente de calendário

### Related ADRs

- [ADR-010: Drag-and-Drop e Mini-Prévia — Addon react-big-calendar + Tooltip Radix](../adrs/adr-010.md) — contexto da abordagem de estilização

## Deliverables

- `resolverCorEvento` ou `resolverEstiloEvento` atualizada com modelo híbrido tipo + urgência
- Todos os chamadores da função atualizados para a nova assinatura (se mudou)
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `resolverEstiloEvento('audiencia', amanhã)` retorna backgroundColor azul com borda espessa (urgência ≤2 dias)
  - [ ] `resolverEstiloEvento('audiencia', próxima semana + 8 dias)` retorna backgroundColor azul com opacidade reduzida (urgência >7 dias)
  - [ ] `resolverEstiloEvento('intimacao', hoje + 5 dias)` retorna backgroundColor laranja com intensidade média (3-7 dias)
  - [ ] `resolverEstiloEvento('tarefa', qualquer data)` retorna backgroundColor verde
  - [ ] `resolverEstiloEvento('lembrete', qualquer data)` retorna backgroundColor amarelo
  - [ ] `resolverEstiloEvento('prazo_fatal', ontem)` retorna backgroundColor vermelho (prazo_fatal sempre vermelho independente de data)
  - [ ] `resolverEstiloEvento('outro', qualquer data)` retorna backgroundColor cinza
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Nenhuma regressão no componente `CalendarioProcessual.tsx` — calendário continua renderizando corretamente
- Cada tipo de evento visualmente distinguível pela cor base no calendário
