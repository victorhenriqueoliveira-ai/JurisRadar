# Contexto — task_01

## Requisitos do PRD

O JurisRadar SaaS é uma plataforma premium para advogados. O design deve transmitir credibilidade jurídica com visual moderno e diferenciado, usando componentes do uiverse.io para diferenciação visual. A paleta é azul-marinho + dourado. Dark mode obrigatório. Totalmente responsivo (375px, 768px, 1280px).

## Especificação Técnica

### Design System — Tokens + uiverse.io (TechSpec seção "Integration Points — uiverse.io")

Estratégia: CSS custom properties em `src/styles/tokens.css`, importado em `src/app/globals.css`. Valores hardcoded dos componentes uiverse.io substituídos por `var(--jr-*)`. Estilos encapsulados em `@layer components`.

**Tokens obrigatórios:**
- `--jr-primary`: azul-marinho (#0f2d5e light, #1a4a8a dark)
- `--jr-accent`: dourado (#c9a84c light, #e2c070 dark)
- `--jr-success`: verde (#16a34a)
- `--jr-warning`: âmbar (#d97706)
- `--jr-danger`: vermelho (#dc2626)
- `--jr-glass-bg`: rgba com blur para glassmorphism
- `--jr-glass-border`: borda sutil para cards glass
- `--jr-gradient-start` / `--jr-gradient-end`: gradiente hero

**Mapeamento para shadcn/ui:** cada `--jr-*` mapeia para `--primary`, `--accent` etc. para dark mode automático.

**Componentes uiverse.io prioritários:**
1. `UiButton` — botão com efeito glow/ripple (substitui CTAs primários)
2. `GlassCard` — card glassmorphism para métricas do dashboard
3. `PulsingBadge` — badge animado para notificações urgentes
4. `ImportLoader` — loader animado para tela de importação de processos
5. `EmptyStateIllustrated` — empty state com SVG animado para seções sem dados

### ADR-004 resumo
Design tokens compartilhados: shadcn/ui mantém acessibilidade Radix UI + uiverse.io adiciona visual premium. Trade-off: cada componente uiverse.io requer adaptação manual (~15 min).

## Arquivos existentes relevantes

- `src/app/globals.css` — adicionar `@import '../styles/tokens.css'` ANTES das diretivas Tailwind
- `tailwind.config.ts` — verificar se extend.colors usa CSS variables; alinhar com tokens
- `components.json` — confirmar `cssVariables: true`

## Arquivos a criar

- `src/styles/tokens.css`
- `src/components/ui-custom/UiButton.tsx`
- `src/components/ui-custom/GlassCard.tsx`
- `src/components/ui-custom/PulsingBadge.tsx`
- `src/components/ui-custom/ImportLoader.tsx`
- `src/components/ui-custom/EmptyStateIllustrated.tsx`
- `src/components/ui-custom/index.ts`

## Notas de implementação

- Não instalar biblioteca adicional — componentes uiverse.io são CSS+JSX puros
- Usar `@layer components` para estilos de cada componente
- Nenhum valor hardcoded de cor (`#`, `rgb(`, `hsl(`) nos arquivos de ui-custom
- Props obrigatórias: todos os componentes aceitam `className?: string`
- Testes: usar Vitest + @testing-library/react (padrão do projeto)
- Meta de cobertura: ≥80%
