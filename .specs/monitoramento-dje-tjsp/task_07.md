---
status: completed
title: Frontend — Painel de busca DJE
type: frontend
complexity: high
dependencies:
  - task_06
---

# Task 07: Frontend — Painel de busca DJE

## Overview

Implementa a página principal da seção "Publicações DJE" (`src/app/(protected)/dje/page.tsx`) com formulário de busca (termo + período), lista de resultados paginada com `PublicationCard` e avisos de cobertura. Adiciona o item "Publicações DJE" no menu lateral de navegação. É a principal interface do advogado com a feature.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar a página em `src/app/(protected)/dje/page.tsx` dentro do grupo de rotas autenticadas existente
- O formulário DEVE ter campos: "Termo de busca" (texto, mínimo 2 chars), "Data inicial" (date picker) e "Data final" (date picker) — usando `react-hook-form` e `@hookform/resolvers/zod` com o mesmo schema Zod da API
- A busca DEVE ser disparada via `POST /api/dje/searches` e exibir resultados de forma síncrona (sem polling); durante o fetch, mostrar estado de carregamento no botão "Buscar"
- O `PublicationCard` DEVE exibir: número CNJ, instância ("1ª Instância" ou "2ª Instância"), vara/câmara (ou "—" se não identificada), data da publicação no formato `DD/MM/YYYY`, e snippet com o termo destacado (renderizar `<mark>` do snippet como HTML via `dangerouslySetInnerHTML` em `<span>`)
- O card DEVE incluir link "Consultar no TJSP" apontando para `https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado={numero_sem_formatacao}&foroNumeroUnificado=0000&dadosConsulta.valorConsultaNuUnificado={numero_formatado}&dadosConsulta.valorConsulta=&dadosConsulta.tipoNuUnificado=UNIFICADO` — ou simplesmente uma busca genérica no TJSP se o padrão exato de URL não for determinístico
- DEVE exibir aviso permanente de cobertura: "Resultados provenientes do DJE/TJSP — Cadernos 2 e 3 (Capital). Interior e outros tribunais não cobertos."
- DEVE exibir total de resultados e navegação de páginas (paginação via `?page` na query da API)
- DEVE exibir estado "Sem resultados" com mensagem diferenciada de "Período sem dados indexados ainda"
- DEVE adicionar item "Publicações DJE" no menu lateral (`src/app/(protected)/layout.tsx` ou componente de navegação equivalente)
</requirements>

## Subtasks

- [x] 7.1 Identificar e analisar o componente de layout/navegação existente em `src/app/(protected)/` para entender onde adicionar o item de menu "Publicações DJE"
- [x] 7.2 Criar `src/app/(protected)/dje/page.tsx` com o formulário de busca usando `react-hook-form` + Zod
- [x] 7.3 Implementar o `PublicationCard` (pode ser em `src/components/dje/PublicationCard.tsx` ou inline na página, conforme o padrão de organização de componentes do projeto)
- [x] 7.4 Implementar paginação de resultados com botões "Anterior" / "Próxima" ou numeração
- [x] 7.5 Implementar estados da interface: carregando, sem resultados, período sem dados, aviso de cobertura
- [x] 7.6 Adicionar link "Publicações DJE" no menu lateral
- [x] 7.7 Escrever testes de componente com `@testing-library/react`

## Implementation Details

Referencie a seção "Experiência do Usuário" do PRD e a seção "API Endpoints" do TechSpec para o contrato da API que o frontend consome.

Analisar a página de busca DataJud existente em `src/app/(protected)/` para entender: como `react-hook-form` é usado, como fetch à API é feito (fetch nativo ou algum wrapper), padrão de componentes UI (shadcn/ui via `@base-ui/react`). O formulário DJE deve seguir os mesmos padrões visuais e de validação.

O snippet contém tags HTML `<mark>...</mark>` — usar `<span dangerouslySetInnerHTML={{ __html: result.snippet }} />` dentro do card. O conteúdo vem da nossa própria API (não de input do usuário), tornando o uso de `dangerouslySetInnerHTML` seguro neste contexto.

A URL de consulta no TJSP pelo número CNJ deve ser validada manualmente antes do merge — o padrão de URL do ESAJ pode variar.

### Relevant Files

- `src/app/(protected)/dje/page.tsx` — criar
- `src/components/dje/PublicationCard.tsx` — criar (ou inline, seguir padrão do projeto)
- `src/app/(protected)/layout.tsx` — modificar para adicionar item de menu
- `src/app/(protected)/` — analisar páginas existentes para entender padrão de componentes e fetch

### Dependent Files

- `src/app/(protected)/dje/history/page.tsx` (task_08) — mesma seção DJE, mesmo item de menu ativo
- `src/app/api/dje/searches/route.ts` (task_06) — endpoint consumido

### Related ADRs

- [ADR-004: Estratégia de Resultados de Busca DJE — Requery ao Vivo](adrs/adr-004.md) — o frontend não faz polling; busca é síncrona e resultado retorna diretamente do POST

## Deliverables

- `src/app/(protected)/dje/page.tsx` com formulário e lista de resultados
- `src/components/dje/PublicationCard.tsx` (ou equivalente)
- Item "Publicações DJE" adicionado ao menu de navegação
- Testes de componente com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes de componente (`@testing-library/react`):
  - [x] Formulário renderiza os campos "Termo de busca", "Data inicial" e "Data final"
  - [x] Submeter formulário com "Termo de busca" vazio exibe mensagem de validação "Mínimo 2 caracteres" sem chamar a API
  - [x] Submeter formulário com `dateFrom > dateTo` exibe mensagem de validação sem chamar a API
  - [x] Durante o fetch (mock pendente), botão "Buscar" exibe estado de carregamento e está desabilitado
  - [x] Quando a API retorna 0 resultados, exibe mensagem "Nenhuma publicação encontrada"
  - [x] Quando a API retorna resultados, `PublicationCard` renderiza número CNJ, instância, vara e data para cada item
  - [x] Snippet com `<mark>termo</mark>` é renderizado com tag `<mark>` visível no DOM (não como texto literal)
  - [x] Link "Consultar no TJSP" tem `target="_blank"` e `rel="noopener noreferrer"`
  - [x] Aviso de cobertura "Cadernos 2 e 3 — Capital" é sempre visível na página, independente do estado da busca
  - [x] Quando `total > limit`, botões de paginação são renderizados; clicar em "Próxima" dispara nova busca com `page + 1`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Fluxo completo funcionando no browser: formulário → busca → resultados paginados → link TJSP
- Snippet com termo destacado visível no card (tag `<mark>` renderizada, não como texto)
- Item "Publicações DJE" visível e ativo no menu lateral ao acessar `/dje`
- Página acessível sem autenticação redireciona para `/login` (comportamento do middleware existente)
