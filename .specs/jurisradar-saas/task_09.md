---
status: pending
title: CRM frontend: tabela, filtros e painel lateral
type: frontend
complexity: high
dependencies:
  - task_01
  - task_04
  - task_08
---

# Task 09: CRM frontend: tabela, filtros e painel lateral

## Overview

Constrói a interface do CRM de processos: tabela de listagem com filtros e ordenação, painel lateral deslizante com detalhe completo do processo (movimentações, notas e honorário), e versão mobile com cards verticais. É a tela mais usada do produto — qualidade e performance são críticas.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 3: CRM de Processos") e o TechSpec (seção "API Endpoints — Processos") antes de começar
- REFERENCIE O TECHSPEC para os endpoints consumidos e a estrutura de dados de processos
- FOQUE NO "QUÊ" — interface do CRM; lógica de backend já está na task_08
- MINIMIZE CÓDIGO — use componentes shadcn/ui (Table, Sheet, Badge, Select) como base
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE renderizar tabela de processos com colunas: número CNJ, partes principais, tribunal, área, status, última movimentação, próximo prazo e responsável
- DEVE implementar filtros por: status (Select), área (Select), tribunal (Select), responsável (Select), urgência (Toggle) e busca textual (Input com debounce de 300ms)
- DEVE implementar ordenação por qualquer coluna com indicador visual (ícone asc/desc)
- DEVE implementar paginação por cursor (botão "Carregar mais")
- DEVE abrir painel lateral (Sheet) ao clicar num processo, exibindo: movimentações cronológicas, notas internas e valor do honorário
- DEVE exibir badge de urgência (usando `PulsingBadge` da task_01) em processos com prazo ≤ 5 dias ou intimação não lida
- DEVE exibir indicador "Última sync DD/MM às HH:MM" no topo da tabela
- DEVE usar `EmptyStateIllustrated` (task_01) quando não houver processos
- DEVE usar cards verticais no mobile (≤767px) em vez de tabela
- DEVERIA virtualizar a lista quando houver mais de 100 processos para manter performance
</requirements>

## Subtasks

- [ ] 9.1 Criar `src/app/(app)/crm/page.tsx` com fetch de `GET /api/processos` e estado de filtros/ordenação
- [ ] 9.2 Criar componente `ProcessoTable` com colunas, sorting e paginação por cursor
- [ ] 9.3 Criar componente `ProcessoFilters` com todos os filtros e busca com debounce
- [ ] 9.4 Criar componente `ProcessoSheet` (painel lateral) com movimentações, notas e honorário
- [ ] 9.5 Criar componente `ProcessoCard` para visualização mobile
- [ ] 9.6 Adicionar badge de urgência com `PulsingBadge` e indicador de última sync
- [ ] 9.7 Escrever testes de renderização e interação dos filtros

## Implementation Details

Arquivos a criar:
- `src/app/(app)/crm/page.tsx` — página principal do CRM
- `src/components/crm/ProcessoTable.tsx` — tabela com sorting e paginação
- `src/components/crm/ProcessoFilters.tsx` — painel de filtros
- `src/components/crm/ProcessoSheet.tsx` — painel lateral de detalhe
- `src/components/crm/ProcessoCard.tsx` — card mobile
- `src/components/crm/MovimentacaoTimeline.tsx` — lista cronológica de movimentações
- `src/components/crm/NotasList.tsx` — lista de notas com formulário de adição

Componentes shadcn/ui a usar: `Table`, `Sheet`, `Badge`, `Select`, `Input`, `Button`, `Skeleton`
Componentes uiverse.io a usar: `PulsingBadge` (urgência), `EmptyStateIllustrated` (sem processos)

### Relevant Files

- `src/app/(app)/crm/page.tsx` — placeholder criado na task_04; substituir conteúdo
- `src/components/ui-custom/PulsingBadge.tsx` (task_01) — badge animado de urgência
- `src/components/ui-custom/EmptyStateIllustrated.tsx` (task_01) — empty state

### Dependent Files

- `src/app/(app)/financeiro/page.tsx` (task_16) — honorário exibido no painel lateral do CRM
- `src/app/(app)/notificacoes/` (task_10) — badge de intimação não lida alimenta `PulsingBadge`

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — o frontend nunca envia `org_id`; sempre derivado da sessão no backend

## Deliverables

- `src/app/(app)/crm/page.tsx` com todos os filtros e tabela/cards funcionais
- Componentes `ProcessoTable`, `ProcessoFilters`, `ProcessoSheet`, `ProcessoCard`
- Testes de renderização e interação com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `ProcessoTable` com lista vazia renderiza `EmptyStateIllustrated`
  - [ ] `ProcessoTable` com 5 processos renderiza 5 linhas
  - [ ] Clicar em cabeçalho de coluna "Próximo prazo" muda ícone para `asc`; segundo clique para `desc`
  - [ ] `ProcessoFilters` com `status="ativo"` selecionado chama `onFilterChange` com `{ status: 'ativo' }`
  - [ ] Busca textual com debounce: não chama `onSearch` imediatamente; chama após 300ms
  - [ ] Processo com prazo ≤ 5 dias exibe `PulsingBadge` vermelho
- Testes de integração:
  - [ ] Clicar numa linha da tabela abre `ProcessoSheet` com detalhes do processo
  - [ ] `ProcessoSheet` com 3 movimentações exibe 3 itens na timeline
  - [ ] Em viewport 375px, `ProcessoTable` não renderiza; `ProcessoCard` renderiza
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Filtros atualizam a listagem sem reload de página
- Painel lateral abre e fecha sem perder o estado dos filtros
- Em mobile, cards exibem as informações essenciais sem scroll horizontal
