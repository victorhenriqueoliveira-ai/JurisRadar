---
status: pending
title: Frontend — Histórico de Buscas
type: frontend
complexity: medium
dependencies:
  - task_06
  - task_07
---

# Task 08: Frontend — Histórico de Buscas

## Overview

Implementa a tela de histórico `/history` onde o usuário visualiza todas as suas buscas salvas (com status, data e total de resultados), pode reexecutar qualquer busca com um clique e exportar os resultados de buscas concluídas em CSV. Reutiliza componentes da task_07 onde possível e consome os endpoints `GET /api/searches` e `POST /api/searches/[id]/rerun`.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar a página `/history` em `src/app/(protected)/history/page.tsx` acessível apenas para usuários autenticados.
- DEVE listar as buscas do usuário paginadas, ordenadas por `created_at DESC`, consumindo `GET /api/searches`.
- Cada item da lista DEVE exibir: nome da busca (ou "Sem nome"), status (com badge colorido por estado), data/hora de criação, total de resultados e filtros resumidos.
- DEVE exibir botão "Reexecutar" em cada item que chama `POST /api/searches/[id]/rerun` e redireciona o usuário para `/search?searchId={novoId}` para acompanhar o progresso da nova busca.
- DEVE exibir botão "Exportar CSV" em itens com status `completed` ou `partial` e `totalResults > 0`, disparando `GET /api/searches/[id]/export?formato=csv`.
- DEVE exibir estado vazio com mensagem encorajadora quando o usuário não tem buscas salvas ainda.
- DEVE exibir estado de carregamento durante o fetch inicial de `GET /api/searches`.
- A página DEVE ser server-rendered (RSC) com os dados iniciais, usando client components apenas para interações (botões de ação).
- NÃO DEVE exibir buscas de outros usuários (garantido pelo endpoint, mas o componente não deve assumir dados de outros contextos).
</requirements>

## Subtasks

- [ ] 8.1 Criar `src/app/(protected)/history/page.tsx` como React Server Component buscando dados iniciais
- [ ] 8.2 Criar componente `SearchHistoryList` com listagem, paginação e badges de status
- [ ] 8.3 Implementar botão "Reexecutar" com feedback de carregamento e redirecionamento para `/search`
- [ ] 8.4 Implementar botão "Exportar CSV" reaproveitando lógica de download da task_07
- [ ] 8.5 Implementar estado vazio e estado de carregamento
- [ ] 8.6 Adicionar link de navegação para `/history` no layout protegido (task_07)

## Implementation Details

Consulte a seção **"Histórias de Usuário — Fluxo de gestão de buscas"** do PRD para os comportamentos esperados de cada ação do histórico.

A página `/history` pode ser um RSC que busca os dados via `fetch('/api/searches')` com `cache: 'no-store'` (dados sempre frescos). Os botões de ação ("Reexecutar", "Exportar") são client components que fazem chamadas fetch ao clicar.

Estrutura esperada:

```
src/
  app/(protected)/
    history/
      page.tsx               ← RSC com dados iniciais
  components/
    history/
      SearchHistoryList.tsx  ← lista de buscas com ações
      SearchHistoryItem.tsx  ← item individual com badges e botões
```

### Relevant Files

- `src/app/(protected)/history/page.tsx` — página de histórico
- `src/components/history/SearchHistoryList.tsx` — componente de listagem
- `src/components/history/SearchHistoryItem.tsx` — item com ações

### Dependent Files

- `src/app/(protected)/layout.tsx` (task_07) — adicionar link de navegação para `/history`
- `src/app/(protected)/search/page.tsx` (task_07) — destino do redirecionamento após "Reexecutar"

### Related ADRs

Nenhum ADR específico — implementação de frontend seguindo os contratos da API definidos no TechSpec.

## Deliverables

- Página `/history` com listagem, paginação e ações por item
- Componentes `SearchHistoryList` e `SearchHistoryItem` reutilizáveis
- Botão "Reexecutar" funcional com redirecionamento
- Botão "Exportar CSV" funcional para buscas concluídas
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração do fluxo de reexecução **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `SearchHistoryItem` com `status: 'completed'` exibe badge verde e botão "Exportar CSV" habilitado
  - [ ] `SearchHistoryItem` com `status: 'processing'` exibe badge amarelo e botão "Exportar CSV" desabilitado
  - [ ] `SearchHistoryItem` com `status: 'failed'` exibe badge vermelho e botão "Exportar CSV" oculto
  - [ ] `SearchHistoryItem` com `name: null` exibe "Sem nome" no lugar do nome
  - [ ] `SearchHistoryList` com array vazio exibe estado vazio com mensagem encorajadora
  - [ ] `SearchHistoryList` com 5 itens renderiza 5 `SearchHistoryItem`
- Testes de integração:
  - [ ] Clicar em "Reexecutar" chama `POST /api/searches/[id]/rerun` e redireciona para `/search?searchId={novoId}`
  - [ ] Clicar em "Exportar CSV" em busca `completed` inicia download do arquivo CSV
  - [ ] Acesso a `/history` sem sessão redireciona para `/login`
  - [ ] `/history` de usuário A não exibe buscas do usuário B (verificado via mock do endpoint retornando lista correta)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Fluxo de reexecução funcional: clicar "Reexecutar" → nova busca criada → redirecionado para `/search` com progresso visível
- Badges de status refletem corretamente o estado de cada busca (cores distintas para `completed`, `partial`, `processing`, `failed`)
- Estado vazio exibido quando usuário não tem buscas (sem lista vazia sem indicação)
- Botão "Exportar CSV" não aparece em buscas `pending`, `processing` ou `failed`
