---
status: completed
title: Frontend — Histórico de buscas DJE
type: frontend
complexity: medium
dependencies:
  - task_06
  - task_07
---

# Task 08: Frontend — Histórico de buscas DJE

## Overview

Implementa a página de histórico de buscas DJE (`src/app/(protected)/dje/history/page.tsx`) que exibe as buscas anteriores do advogado com termo, período, total de resultados e data de execução. Cada item do histórico tem botões de "Reexecutar" (que navega para a página de busca com os resultados) e "Exportar CSV".

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `src/app/(protected)/dje/history/page.tsx` acessível via `/dje/history`
- A lista DEVE ser carregada via `GET /api/dje/searches` e exibir para cada busca: termo, período (dateFrom a dateTo no formato DD/MM/YYYY), total de resultados da última execução, e data/hora de execução no formato `DD/MM/YYYY HH:mm`
- O botão "Reexecutar" DEVE chamar `POST /api/dje/searches/[id]/rerun` e, após receber o novo `searchId`, navegar para `/dje?searchId={newId}` onde a página de busca exibe automaticamente os resultados
- O botão "Exportar CSV" DEVE acionar o download via `GET /api/dje/searches/[id]/export` usando a técnica de link temporário (`<a href download>`) para iniciar o download sem navegar para fora da página
- A lista DEVE ser paginada com o mesmo padrão da página de busca (task_07)
- Estado de lista vazia DEVE exibir mensagem "Nenhuma busca realizada ainda" com link para "/dje"
- Durante o "Reexecutar", o botão DEVE mostrar estado de carregamento e ficar desabilitado até a navegação
</requirements>

## Subtasks

- [x] 8.1 Criar `src/app/(protected)/dje/history/page.tsx` com lista de buscas via `GET /api/dje/searches`
- [x] 8.2 Implementar o item de histórico com campos: termo, período, total de resultados, data de execução
- [x] 8.3 Implementar botão "Reexecutar" com chamada à API de rerun e navegação para `/dje?searchId={id}`
- [x] 8.4 Implementar botão "Exportar CSV" com download via link temporário
- [x] 8.5 Implementar paginação e estado de lista vazia
- [x] 8.6 Verificar se a página de busca (task_07) suporta receber `?searchId` na query string para exibir resultados de uma busca prévia — se não suportar, implementar esse comportamento também nesta tarefa (dependência cruzada com task_07)
- [x] 8.7 Escrever testes de componente

## Implementation Details

Referencie a seção "Features Principais — Histórico de Buscas no DJE" do PRD e os endpoints `GET /api/dje/searches` e `POST /api/dje/searches/[id]/rerun` na seção "API Endpoints" do TechSpec.

Analisar a página de histórico DataJud existente para entender o padrão visual e de interação já implementado no projeto — a página DJE deve seguir o mesmo design.

O download do CSV via botão não deve navegar para fora da página. O padrão para isso é:
```javascript
const a = document.createElement('a');
a.href = `/api/dje/searches/${id}/export`;
a.download = `dje-${id}.csv`;
a.click();
```

A subtarefa 8.6 é importante: se task_07 não implementar a leitura de `?searchId` da URL para exibir resultados de uma busca salva, a navegação após "Reexecutar" não terá efeito visível. Coordenar com task_07 ou implementar aqui como extensão.

### Relevant Files

- `src/app/(protected)/dje/history/page.tsx` — criar
- `src/app/(protected)/dje/page.tsx` (task_07) — verificar se suporta `?searchId` na URL; modificar se necessário
- `src/app/(protected)/` — analisar páginas existentes de histórico para padrão visual

### Dependent Files

- Nenhum arquivo existente é modificado (exceto possivelmente `src/app/(protected)/dje/page.tsx` para suporte a `?searchId`)

### Related ADRs

- [ADR-004: Estratégia de Resultados de Busca DJE — Requery ao Vivo](adrs/adr-004.md) — "Reexecutar" cria nova entrada em `dje_searches` via POST rerun, não serve snapshot

## Deliverables

- `src/app/(protected)/dje/history/page.tsx` com lista paginada, reexecução e exportação CSV
- Testes de componente com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes de componente (`@testing-library/react`):
  - [x] Lista renderiza corretamente 3 buscas mockadas com termo, período, total de resultados e data
  - [x] Quando `GET /api/dje/searches` retorna lista vazia, exibe "Nenhuma busca realizada ainda" com link para "/dje"
  - [x] Clicar em "Reexecutar" chama `POST /api/dje/searches/[id]/rerun` e desabilita o botão durante o fetch
  - [x] Após resposta de rerun com `{ searchId: 'novo-id' }`, navega para `/dje?searchId=novo-id`
  - [x] Clicar em "Exportar CSV" cria elemento `<a>` com `href` contendo `/api/dje/searches/[id]/export` e dispara click (mock do `document.createElement`)
  - [x] Paginação renderiza botão "Próxima" quando `total > limit` e dispara nova chamada a `GET /api/dje/searches?page=2` ao clicar
  - [x] Período formatado como "01/08/2026 a 07/08/2026" (não como ISO 8601)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Fluxo completo: histórico carregado → clicar "Reexecutar" → navegar para `/dje` com resultados exibidos
- Download de CSV inicia no browser ao clicar "Exportar CSV" sem navegar para fora da página
- Lista exibe buscas ordenadas da mais recente para a mais antiga
- Link "Publicações DJE" no menu lateral aciona subnavegação com itens "Busca" e "Histórico" (ou padrão equivalente do projeto)
