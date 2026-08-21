---
status: pending
title: Adicionar loading.tsx nas rotas principais
type: frontend
complexity: low
dependencies: []
---

# Task 12: Adicionar `loading.tsx` nas rotas principais

## Overview
As rotas `/dashboard`, `/crm` e `/calendario` não têm `loading.tsx`, o que causa tela em branco durante o carregamento de Server Components. Esta tarefa adiciona skeletons de carregamento para cada rota, reduzindo a percepção de lentidão sem alterar a lógica de dados.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `loading.tsx` em `src/app/(app)/dashboard/`, `src/app/(app)/crm/` e `src/app/(app)/calendario/`
- Os skeletons DEVEM ter estrutura visual similar à tela real (mesma quantidade de cards/colunas)
- DEVE usar animação de pulse (classe Tailwind `animate-pulse` ou equivalente já usado no projeto)
- NÃO DEVE importar dados reais ou fazer fetch nos arquivos `loading.tsx`
- Os skeletons DEVEM ser componentes puros sem estado
</requirements>

## Subtasks
- [ ] 12.1 Verificar o padrão de skeleton já usado em outras partes do projeto
- [ ] 12.2 Criar `src/app/(app)/dashboard/loading.tsx` com skeleton dos KPI cards e gráficos
- [ ] 12.3 Criar `src/app/(app)/crm/loading.tsx` com skeleton da tabela de processos
- [ ] 12.4 Criar `src/app/(app)/calendario/loading.tsx` com skeleton do calendário
- [ ] 12.5 Verificar que os skeletons aparecem corretamente ao navegar entre rotas

## Implementation Details
Arquivos a criar:
- `src/app/(app)/dashboard/loading.tsx`
- `src/app/(app)/crm/loading.tsx`
- `src/app/(app)/calendario/loading.tsx`

Verificar se há componente de skeleton reutilizável em `src/components/ui/` ou `src/components/ui-custom/` antes de criar novos. Reutilizar padrões existentes.

Ver TechSpec > Impact Analysis para a lista de componentes afetados por esta tarefa.

### Relevant Files
- `src/app/(app)/dashboard/page.tsx` — estrutura de referência para o skeleton
- `src/app/(app)/crm/page.tsx` — estrutura de referência para o skeleton
- `src/app/(app)/calendario/page.tsx` — estrutura de referência para o skeleton
- `src/components/ui-custom/` — verificar skeletons existentes

### Dependent Files
Nenhum arquivo depende diretamente desta tarefa.

### Related ADRs
Nenhum ADR específico para esta tarefa.

## Deliverables
- `loading.tsx` criado para dashboard, CRM e calendário
- Testes de renderização **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [ ] `dashboard/loading.tsx` renderiza sem erros e sem fazer fetch
  - [ ] `crm/loading.tsx` renderiza sem erros e sem fazer fetch
  - [ ] `calendario/loading.tsx` renderiza sem erros e sem fazer fetch
  - [ ] Cada skeleton contém ao menos os elementos estruturais principais da tela real (cards, tabela, calendário)
- Testes de integração:
  - [ ] (Manual) Navegar para `/dashboard`, `/crm` e `/calendario` em conexão lenta e verificar que skeleton aparece antes do conteúdo real
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Nenhuma tela em branco ao navegar entre as três rotas principais
- Skeleton visualmente reconhecível como a tela que será carregada
