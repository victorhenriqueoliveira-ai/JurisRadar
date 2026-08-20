---
status: completed
title: Design tokens e componentes uiverse.io base
type: frontend
complexity: medium
dependencies: []
---

# Task 01: Design tokens e componentes uiverse.io base

## Overview

Cria a camada de design tokens centralizada em CSS custom properties que harmoniza shadcn/ui com componentes do uiverse.io, estabelecendo a identidade visual premium do JurisRadar SaaS. Esta tarefa define a paleta jurídica (azul-marinho + dourado), suporte a dark mode unificado e os primeiros 5 componentes uiverse.io adaptados, que serão consumidos por todas as tarefas de frontend subsequentes.

<critical>
- SEMPRE LEIA o PRD (seção "Considerações de UX") e o TechSpec (seção "Integration Points — uiverse.io") antes de começar
- REFERENCIE O TECHSPEC para a lista de componentes uiverse.io prioritários e a estratégia de tokens
- FOQUE NO "QUÊ" — definir os tokens e adaptar os componentes; não construir páginas
- MINIMIZE CÓDIGO — os componentes uiverse.io são copiados e adaptados, não escritos do zero
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `src/styles/tokens.css` com as CSS custom properties `--jr-primary`, `--jr-accent`, `--jr-success`, `--jr-warning`, `--jr-danger`, `--jr-glass-bg`, `--jr-glass-border`, `--jr-gradient-start`, `--jr-gradient-end`
- DEVE importar `tokens.css` em `src/app/globals.css` após as diretivas Tailwind, sem conflito de especificidade
- DEVE mapear cada token `--jr-*` para o equivalente shadcn/ui (`--primary`, `--accent` etc.) para que dark mode funcione automaticamente ao alternar o tema
- DEVE criar os 5 componentes uiverse.io em `src/components/ui-custom/`: `UiButton`, `GlassCard`, `PulsingBadge`, `ImportLoader`, `EmptyStateIllustrated`
- DEVE substituir todos os valores de cor hardcoded nos componentes copiados por variáveis `var(--jr-*)` correspondentes
- DEVE encapsular estilos CSS de cada componente uiverse.io em `@layer components` no Tailwind para evitar conflito de especificidade
- DEVERIA exportar todos os componentes via `src/components/ui-custom/index.ts`
- DEVE funcionar nos breakpoints 375px, 768px e 1280px sem overflow horizontal
</requirements>

## Subtasks

- [x] 1.1 Criar `src/styles/tokens.css` com paleta completa (light + dark) e importar em `globals.css`
- [x] 1.2 Copiar e adaptar `UiButton` do uiverse.io (efeito glow/ripple) substituindo cores hardcoded por tokens
- [x] 1.3 Copiar e adaptar `GlassCard` (glassmorphism) com `var(--jr-glass-bg)` e `var(--jr-glass-border)`
- [x] 1.4 Copiar e adaptar `PulsingBadge` (badge com pulso animado para notificações urgentes)
- [x] 1.5 Copiar e adaptar `ImportLoader` (loader animado para tela de importação do onboarding)
- [x] 1.6 Copiar e adaptar `EmptyStateIllustrated` (SVG animado para seções sem dados)
- [x] 1.7 Criar barrel export em `src/components/ui-custom/index.ts` e escrever testes de renderização

## Implementation Details

Arquivos a criar:
- `src/styles/tokens.css` — definição central de todas as CSS custom properties
- `src/components/ui-custom/UiButton.tsx` — botão com efeito glow/ripple
- `src/components/ui-custom/GlassCard.tsx` — card glassmorphism para dashboard
- `src/components/ui-custom/PulsingBadge.tsx` — badge animado para urgência
- `src/components/ui-custom/ImportLoader.tsx` — loader para importação de processos
- `src/components/ui-custom/EmptyStateIllustrated.tsx` — empty state com SVG animado
- `src/components/ui-custom/index.ts` — barrel export

Arquivos a modificar:
- `src/app/globals.css` — adicionar `@import '../styles/tokens.css'` antes de `@tailwind base`

Veja a seção "Integration Points — uiverse.io + Design System" e "ADR-004" do TechSpec para a estratégia completa de tokens e lista de componentes prioritários.

### Relevant Files

- `src/app/globals.css` — ponto de entrada dos estilos globais; importar tokens aqui
- `tailwind.config.ts` — verificar se extend.colors já usa CSS variables do shadcn/ui; alinhar com tokens novos
- `components.json` — configuração shadcn/ui; confirmar `cssVariables: true` para compatibilidade

### Dependent Files

- `src/app/(app)/layout.tsx` (task_04) — consumirá sidebar e layout usando tokens e `GlassCard`
- `src/app/(app)/dashboard/page.tsx` (task_13) — usará `GlassCard` para cards de métricas
- `src/app/(app)/crm/page.tsx` (task_09) — usará `EmptyStateIllustrated` e `PulsingBadge`
- `src/components/ui-custom/ImportLoader.tsx` (task_18) — usado no fluxo de onboarding

### Related ADRs

- [ADR-004: Design System — Tokens Compartilhados entre shadcn/ui e uiverse.io](adrs/adr-004.md) — Define a estratégia de tokens CSS e lista de componentes uiverse.io prioritários

## Deliverables

- `src/styles/tokens.css` com paleta completa (light + dark mode)
- 5 componentes uiverse.io adaptados em `src/components/ui-custom/`
- `src/components/ui-custom/index.ts` com barrel export
- Storybook manual ou página de sandbox `/dev/ui` mostrando todos os 5 componentes (opcional mas recomendado)
- Testes de renderização com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `GlassCard` renderiza com `children` e aplica classe `glass-card` derivada dos tokens
  - [x] `UiButton` renderiza com `variant="primary"` e `variant="secondary"` sem erro
  - [x] `PulsingBadge` com `count=0` não renderiza o badge; com `count=5` renderiza "5"
  - [x] `ImportLoader` renderiza a animação sem prop; com `label="Importando..."` exibe o texto
  - [x] `EmptyStateIllustrated` com `title` e `description` renderiza ambos os textos
  - [x] Todos os componentes aceitam `className` adicional sem sobrescrever estilos base
- Testes de integração:
  - [x] Alternar tema dark/light via atributo `data-theme` no `<html>` faz tokens `--jr-primary` mudarem de valor (verificável via `getComputedStyle`)
  - [x] `globals.css` importado numa página Next.js de teste não gera erro de especificidade com classes Tailwind existentes
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Dark mode funciona nos 5 componentes sem CSS adicional além dos tokens
- Nenhum valor de cor hardcoded (`#`, `rgb(`, `hsl(` literal) nos arquivos de `ui-custom/`
- Componentes renderizam corretamente nos breakpoints 375px, 768px e 1280px
