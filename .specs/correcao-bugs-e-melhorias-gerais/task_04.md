---
status: completed
title: Fix pós-filtragem DJEN por termo no corpo da publicação
type: bugfix
complexity: low
dependencies: []
---

# Task 04: Fix pós-filtragem DJEN por termo no corpo da publicação

## Overview
A busca DJEN retorna publicações que não contêm o termo buscado no corpo do texto, porque a API PJe pode fazer match em metadados. Esta tarefa adiciona pós-filtragem no backend: após receber o response da API PJe, filtrar `items` mantendo apenas registros cujo campo `texto` contenha o termo (case-insensitive), e enriquecer a resposta com metadados de filtragem.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE filtrar `items` da resposta PJe mantendo apenas aqueles onde `item.texto` contenha o termo buscado (case-insensitive)
- DEVE tratar `item.texto === null` como "não contém o termo" — excluir o item quando há termo ativo
- NÃO DEVE alterar os parâmetros enviados à API PJe externa
- DEVE retornar os campos adicionais `filteredByTerm: boolean`, `originalTotal: number` no response (ver TechSpec > API Endpoints)
- DEVE logar `{ originalCount, filteredCount, term }` para monitorar eficácia do filtro
- A filtragem DEVE ocorrer apenas quando `texto` (ou `q`) estiver preenchido — sem termo, retornar response original
</requirements>

## Subtasks
- [x] 4.1 Após receber response da API PJe, verificar se há termo de busca ativo
- [x] 4.2 Aplicar `Array.filter()` sobre `items` usando `item.snippet?.toLowerCase().includes(term)` (campo `snippet` = equivalente ao `texto` no contexto desta base de código)
- [x] 4.3 Adicionar `filteredByTerm`, `originalTotal` ao response retornado ao frontend
- [x] 4.4 Adicionar log estruturado com `{ originalCount, filteredCount, term }`
- [x] 4.5 Escrever testes para os casos com e sem termo, e com `snippet` nulo

## Implementation Details
Arquivo a modificar: `src/app/api/djen/searches/route.ts`

A rota atualmente passa o response da API PJe diretamente ao frontend (linha ~36). A pós-filtragem deve ser inserida entre o `fetch` e o `NextResponse.json()`.

Ver TechSpec > Integration Points > "API PJe" e TechSpec > API Endpoints > "MODIFICADO — GET /api/djen/searches" para o formato do response enriquecido.

### Relevant Files
- `src/app/api/djen/searches/route.ts` — rota a modificar
- `src/app/(app)/busca/dje/page.tsx` — frontend que exibe os resultados e receberá os novos campos

### Dependent Files
- `src/app/(app)/busca/dje/page.tsx` — pode usar `filteredByTerm` e `originalTotal` para exibir aviso ao usuário

### Related ADRs
Nenhum ADR específico para esta tarefa.

## Deliverables
- `src/app/api/djen/searches/route.ts` modificado com pós-filtragem
- Testes unitários e de integração **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [ ] Dado array com 5 items onde 3 contêm "capão redondo" no `texto`, retorna 3 items e `filteredByTerm: true`
  - [ ] Dado item com `texto: null` e termo ativo, o item é excluído do resultado
  - [ ] Dado request sem `q` e sem `texto`, retorna todos os items sem filtragem (`filteredByTerm: false`)
  - [ ] Filtragem é case-insensitive: "Capão Redondo" é encontrado em texto com "capão redondo"
  - [ ] `originalTotal` reflete o count antes da filtragem
- Testes de integração:
  - [ ] `GET /api/djen/searches?q=capao+redondo&siglaTribunal=TJSP` retorna apenas items cujo `texto` contém "capao redondo"
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Busca por "capão redondo" não retorna publicações de Guarujá ou outros locais sem o termo no corpo
