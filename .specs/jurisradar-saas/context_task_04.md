# Contexto — task_04

## Dependências integradas

- **task_01 ✅:** `src/styles/tokens.css`, `src/components/ui-custom/GlassCard.tsx`, `UiButton`, `PulsingBadge`, etc.
- **task_03 ✅:** `src/auth.ts` expandido com orgId/role/subscriptionStatus no JWT, `middleware.ts` com redirecionamentos.

## Requisitos

Layout shell da área autenticada `(app)`. Sidebar responsiva. Dark mode. Header com notificações. Totalmente responsivo (375/768/1280px).

## Estrutura de rotas

```
src/app/
├── (public)/          → landing, /login, /register
├── (onboarding)/      → /onboarding
└── (app)/             → área autenticada com sidebar
    ├── layout.tsx     ← CRIAR AQUI
    ├── dashboard/page.tsx   (placeholder)
    ├── crm/page.tsx         (placeholder)
    ├── calendario/page.tsx  (placeholder)
    ├── financeiro/page.tsx  (placeholder)
    ├── busca/page.tsx       (placeholder)
    ├── notificacoes/page.tsx (placeholder)
    └── configuracoes/page.tsx (placeholder)
```

## Componentes a criar

### `src/app/(app)/layout.tsx`
- Verificar sessão via `auth()` do NextAuth; redirecionar `/login` se não autenticado
- Grid: `flex h-screen` — sidebar fixa à esquerda + `main` com overflow-auto à direita
- Envolver com `ThemeProvider` do `next-themes`

### `src/components/layout/Sidebar.tsx`
- Itens: Dashboard (`/app/dashboard`), CRM (`/app/crm`), Busca (`/app/busca`), Calendário (`/app/calendario`), Notificações (`/app/notificacoes`), Financeiro (`/app/financeiro`), Configurações (`/app/configuracoes`)
- Ícones: usar `lucide-react` (`LayoutDashboard`, `FileText`, `Search`, `Calendar`, `Bell`, `DollarSign`, `Settings`)
- Item ativo: usar `usePathname()` para destacar
- Desktop (≥1280px): sidebar larga com ícone + label
- Tablet (768–1279px): sidebar estreita com só ícone + tooltip
- Usar `GlassCard` (task_01) no container da sidebar desktop

### `src/components/layout/AppHeader.tsx`
- Logo/nome do escritório (do JWT session)
- Sino de notificações com `PulsingBadge` (task_01) — count placeholder (task_10 implementará real)
- Avatar dropdown: foto/iniciais, perfil, configurações, logout (`signOut()`)
- Dark mode toggle: ícone sol/lua chamando `setTheme()`
- Botão hambúrguer em mobile para abrir drawer

### `src/components/layout/SidebarMobile.tsx`
- Usar `shadcn/ui Sheet` component
- Mesmo conteúdo de navegação da Sidebar desktop
- Fechar ao navegar

## Dark mode

Instalar `next-themes` se não instalado: `pnpm add next-themes`

No `src/app/layout.tsx` (root), adicionar `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`.

## Existente relevante

- `src/app/(protected)/` — pasta existente com rotas protegidas; verificar se existem arquivos a migrar para `(app)/`
- `src/app/login/page.tsx` — login existente
- `middleware.ts` — já expandido pela task_03 com verificação de orgId e subscriptionStatus

## Testes

Criar `src/components/layout/__tests__/` com Vitest + @testing-library/react.
Meta: ≥80% cobertura.
