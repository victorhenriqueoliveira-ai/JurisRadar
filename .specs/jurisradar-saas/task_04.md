---
status: completed
title: Layout base e sidebar responsiva
type: frontend
complexity: medium
dependencies:
  - task_01
  - task_03
---

# Task 04: Layout base e sidebar responsiva

## Overview

Cria o layout shell da área autenticada com sidebar de navegação fixa, header com sino de notificações e avatar do usuário, suporte a dark mode e responsividade completa. Este layout envolve todas as páginas da área `(app)` e é o esqueleto visual que as tasks de UI subsequentes vão preencher.

<critical>
- SEMPRE LEIA o PRD (seção "Experiência do Usuário — Fluxo Principal") e o TechSpec (seção "Build Order passo 4") antes de começar
- REFERENCIE O TECHSPEC para a estrutura de rotas `(app)` e os componentes de sidebar
- FOQUE NO "QUÊ" — layout e navegação; não implementar conteúdo das páginas
- MINIMIZE CÓDIGO — use componentes shadcn/ui existentes para Sheet (mobile) e Separator
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `src/app/(app)/layout.tsx` como layout raiz da área autenticada com verificação de sessão
- DEVE implementar sidebar fixa em desktop (≥1280px) com ícone + label para: Dashboard, CRM, Busca, Calendário, Notificações, Financeiro, Configurações
- DEVE implementar sidebar colapsável para ícone-only em tablet (768px–1279px)
- DEVE implementar menu mobile via Sheet (drawer lateral) acionado por botão hambúrguer em ≤767px
- DEVE incluir header fixo com: botão de menu (mobile), nome do escritório, sino de notificações com badge de contagem e avatar do usuário com dropdown (perfil, configurações, logout)
- DEVE suportar dark mode via `next-themes` com toggle no header; preferência salva em `localStorage`
- DEVE destacar visualmente o item de menu ativo com base na rota atual (`usePathname`)
- DEVERIA usar `GlassCard` (task_01) para o container da sidebar em desktop
</requirements>

## Subtasks

- [x] 4.1 Criar `src/app/(app)/layout.tsx` com proteção de sessão e estrutura de grid (sidebar + main)
- [x] 4.2 Criar componente `Sidebar` com itens de navegação, ícones Lucide e indicador de rota ativa
- [x] 4.3 Criar componente `AppHeader` com sino de notificações (badge placeholder), avatar e dark mode toggle
- [x] 4.4 Implementar versão colapsável da sidebar para tablet e versão Sheet para mobile
- [x] 4.5 Configurar `next-themes` no provider e adicionar toggle de dark mode no header
- [x] 4.6 Criar páginas placeholder vazias para cada rota da sidebar (para validar a navegação)
- [x] 4.7 Escrever testes de renderização do layout e da sidebar

## Implementation Details

Arquivos a criar:
- `src/app/(app)/layout.tsx` — layout raiz com verificação de sessão e grid sidebar+main
- `src/components/layout/Sidebar.tsx` — sidebar com itens de navegação
- `src/components/layout/AppHeader.tsx` — header com notificações, avatar e dark mode
- `src/components/layout/SidebarMobile.tsx` — drawer Sheet para mobile
- `src/app/(app)/dashboard/page.tsx` — placeholder (será preenchido na task_13)
- `src/app/(app)/crm/page.tsx` — placeholder (task_09)
- `src/app/(app)/calendario/page.tsx` — placeholder (task_14)
- `src/app/(app)/financeiro/page.tsx` — placeholder (task_16)
- `src/app/(app)/busca/page.tsx` — placeholder (task_17)
- `src/app/(app)/notificacoes/page.tsx` — placeholder (task_10)
- `src/app/(app)/configuracoes/page.tsx` — placeholder (task_20)

Arquivos a modificar:
- `src/app/layout.tsx` (root) — adicionar `ThemeProvider` do `next-themes`
- `middleware.ts` — confirmar que rotas `/(app)/*` redirecionam para `/login` sem sessão

### Relevant Files

- `src/app/(protected)/` — estrutura de rotas protegidas existente; renomear para `(app)` e adaptar
- `middleware.ts` — verificar padrão de proteção de rotas existente
- `src/components/ui/sheet.tsx` — componente shadcn/ui Sheet para sidebar mobile (verificar se instalado)
- `src/components/ui-custom/GlassCard.tsx` (task_01) — usar no container da sidebar desktop

### Dependent Files

- `src/app/(app)/crm/page.tsx` (task_09) — receberá a tabela de processos do CRM
- `src/app/(app)/dashboard/page.tsx` (task_13) — receberá os gráficos do dashboard
- `src/components/layout/AppHeader.tsx` (task_10) — sino de notificações receberá contagem real

### Related ADRs

Nenhum ADR específico — decisões de layout derivadas do PRD (seção "Experiência do Usuário").

## Deliverables

- `src/app/(app)/layout.tsx` com proteção de sessão
- Componentes `Sidebar`, `AppHeader` e `SidebarMobile`
- Dark mode funcional via `next-themes`
- Todas as rotas da sidebar renderizando placeholder sem erro
- Testes de renderização com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `Sidebar` renderiza todos os 7 itens de navegação
  - [x] `Sidebar` com `pathname="/app/crm"` aplica classe de item ativo apenas no item CRM
  - [x] `AppHeader` renderiza badge de notificações com `count=0` oculto; `count=3` exibe "3"
  - [x] Dark mode toggle chama `setTheme('dark')` ao clicar
- Testes de integração:
  - [x] Acesso a `/app/dashboard` sem sessão redireciona para `/login`
  - [x] Acesso a `/app/crm` com sessão válida renderiza o layout com sidebar visível
  - [x] Em viewport 375px, sidebar não está visível; botão hambúrguer está visível
  - [x] Em viewport 1280px, sidebar está visível; botão hambúrguer não está visível
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Sidebar funciona em 375px (mobile), 768px (tablet) e 1280px (desktop) sem scroll horizontal
- Dark mode persiste após refresh da página (via localStorage/next-themes)
- Item de menu ativo destacado corretamente em todas as rotas
