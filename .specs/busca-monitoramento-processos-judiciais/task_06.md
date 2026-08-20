---
status: pending
title: Exportação CSV
type: backend
complexity: low
dependencies:
  - task_05
---

# Task 06: Exportação CSV

## Overview

Substitui o stub 501 do endpoint `GET /api/searches/[id]/export` pela implementação real: streama os resultados de uma busca concluída como arquivo CSV com todos os campos disponíveis por processo. A resposta é um stream HTTP para evitar bufferizar N resultados em memória.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE implementar `GET /api/searches/[id]/export?formato=csv` retornando `Content-Type: text/csv; charset=utf-8` e `Content-Disposition: attachment; filename="processos-{id}.csv"`.
- DEVE criar `src/lib/export/csv.ts` com a função que converte `ProcessoResult[]` em linhas CSV, com cabeçalho na primeira linha.
- O CSV DEVE conter as colunas: `numero`, `tribunal`, `grau`, `classe`, `assunto`, `dataDistribuicao`, `orgaoJulgador`, `partes` (nomes concatenados), `ultimaMovimentacao`.
- Valores com vírgula ou aspas duplas DEVEM ser devidamente escapados (RFC 4180).
- DEVE retornar 404 se a busca não existir e 403 se pertencer a outro usuário.
- DEVE retornar 422 se a busca ainda está em `pending` ou `processing` (resultados incompletos).
- A resposta DEVE ser streamada (`ReadableStream` ou `TransformStream`) para não bufferizar toda a lista em memória.
- NÃO DEVE implementar exportação XLSX — Fase 2.
</requirements>

## Subtasks

- [ ] 6.1 Criar `src/lib/export/csv.ts` com gerador de linhas CSV e escape RFC 4180
- [ ] 6.2 Substituir stub em `src/app/api/searches/[id]/export/route.ts` pela implementação real com stream
- [ ] 6.3 Verificar que `Content-Disposition` força download no navegador com nome de arquivo correto

## Implementation Details

Consulte a seção **"API Endpoints"** do TechSpec para os status HTTP esperados por cada cenário de exportação.

A função CSV em `src/lib/export/csv.ts` recebe `ProcessoResult[]` e retorna um `ReadableStream<Uint8Array>` que o Route Handler repassa diretamente no `Response` — sem acumulação em string.

```
src/lib/export/
  csv.ts                   ← gerador de stream CSV

src/app/api/searches/[id]/export/
  route.ts                 ← GET handler (substitui stub 501)
```

### Relevant Files

- `src/lib/export/csv.ts` — lógica de serialização CSV
- `src/app/api/searches/[id]/export/route.ts` — endpoint HTTP de exportação

### Dependent Files

- `src/app/(protected)/history/page.tsx` (task_08) — chama este endpoint ao clicar em "Exportar CSV"
- `src/app/(protected)/search/page.tsx` (task_07) — chama este endpoint ao clicar em "Exportar CSV" na página de resultados

### Related ADRs

Nenhum ADR específico — decisão de implementação direta conforme TechSpec.

## Deliverables

- `src/lib/export/csv.ts` funcional com escape RFC 4180
- `GET /api/searches/[id]/export?formato=csv` retornando stream CSV válido
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração do endpoint de exportação **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `processResultsToCsv([])` retorna apenas a linha de cabeçalho
  - [ ] `processResultsToCsv([result])` retorna cabeçalho + 1 linha de dados com todos os campos corretos
  - [ ] Campo `numero` com vírgula (improvável mas possível) é escapado com aspas duplas
  - [ ] Campo `partes` com múltiplos nomes é concatenado (ex.: "João Silva; Maria Santos")
  - [ ] Campo `ultimaMovimentacao` com valor `null` resulta em célula vazia, não `"null"`
- Testes de integração:
  - [ ] `GET /api/searches/[id]/export?formato=csv` para busca `completed` com 5 resultados retorna `200`, `Content-Type: text/csv` e 6 linhas (1 cabeçalho + 5 dados)
  - [ ] `GET /api/searches/[id]/export` para busca em `processing` retorna `422`
  - [ ] `GET /api/searches/[id]/export` sem sessão retorna `401`
  - [ ] `GET /api/searches/[id]/export` de busca de outro usuário retorna `403`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Download do CSV abre corretamente no Excel e no LibreOffice sem caracteres corrompidos (UTF-8 com BOM opcional)
- Busca com 500 resultados exportada sem timeout de função (stream evita bufferização)
