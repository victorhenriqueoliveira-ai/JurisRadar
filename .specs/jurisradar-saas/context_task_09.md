# Contexto — task_09

## Dependências integradas

- **task_01 ✅:** `PulsingBadge`, `EmptyStateIllustrated`, `GlassCard` em `src/components/ui-custom/`.
- **task_04 ✅:** Layout `(app)` com sidebar. `src/app/(app)/crm/page.tsx` placeholder existe.
- **task_08 ✅:** 6 endpoints REST criados. `src/services/processos.ts` com `listProcessos`, `getProcesso`.

## Requisitos

Interface completa do CRM: tabela com filtros, painel lateral Sheet e cards mobile.

## Endpoints a consumir

- `GET /api/processos?status=&area=&tribunal=&responsavel_id=&q=&cursor=&limit=20`
  Response: `{ data: Processo[], nextCursor: string | null, total: number }`
- `GET /api/processos/[id]` — detalhe com movimentações + notas + honorário
- `POST /api/processos/[id]/notas` — adicionar nota
- `DELETE /api/processos/[id]/notas/[notaId]` — remover nota
- `PATCH /api/processos/[id]` — atualizar status/responsável

## Arquivos a criar

### `src/app/(app)/crm/page.tsx`
Client component. Estado local: `filters`, `ordering`, `selectedProcesso`.
- Fetch paginado com cursor
- Passar props para `ProcessoTable` e `ProcessoFilters`

### `src/components/crm/ProcessoTable.tsx`
Colunas: número CNJ, tribunal, área, status, última movimentação, próximo prazo, responsável.
Sorting com ícone asc/desc. Paginação "Carregar mais". Oculto em mobile (<768px).

### `src/components/crm/ProcessoFilters.tsx`
Filtros: status (Select), área (Select), tribunal (Select), urgência (Toggle), busca (Input debounce 300ms).
Emite `onFilterChange(filters)`.

### `src/components/crm/ProcessoSheet.tsx`
shadcn `Sheet`. Aberto ao clicar na linha da tabela.
Exibe: MovimentacaoTimeline, NotasList, valor do honorário.

### `src/components/crm/ProcessoCard.tsx`
Card mobile. Visível apenas em <768px. Exibe: número CNJ, status, prazo.

### `src/components/crm/MovimentacaoTimeline.tsx`
Lista cronológica de movimentações.

### `src/components/crm/NotasList.tsx`
Lista de notas + formulário de adição inline.

## Testes obrigatórios

- `ProcessoTable` com lista vazia → `EmptyStateIllustrated`
- `ProcessoTable` com 5 processos → 5 linhas renderizadas
- Clicar linha → abre `ProcessoSheet`
- `ProcessoFilters` muda → chama `onFilterChange` correto
- Input debounce 300ms: não chama imediatamente
- Processo com prazo ≤ 5 dias → `PulsingBadge` vermelho
- Em 375px → `ProcessoCard` visível, `ProcessoTable` oculta

## Design

Usar `var(--jr-*)` tokens. Classe `glass-card` do GlassCard. shadcn Table, Sheet, Badge, Select, Input, Button, Skeleton.
