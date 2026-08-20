---
status: completed
title: DJE Parser — extração e segmentação de publicações
type: backend
complexity: high
dependencies:
  - task_01
  - task_02
---

# Task 03: DJE Parser — extração e segmentação de publicações

## Overview

Implementa `src/lib/dje/parser.ts`, que recebe o buffer de um PDF do DJE, extrai o texto bruto via `pdf-parse` e segmenta o texto em publicações individuais identificadas pelo número de processo no formato CNJ. É a etapa mais frágil do pipeline — o comportamento real do PDF do TJSP deve ser validado empiricamente com cadernos reais antes do merge.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar `pdf-parse` e `@types/pdf-parse` como dependências de produção via `pnpm add pdf-parse @types/pdf-parse`
- DEVE exportar `extractTextFromPdf(buffer: Buffer): Promise<string>` que retorna o texto bruto extraído pelo `pdf-parse`
- DEVE exportar `segmentPublications(text: string, caderno: 2 | 3, publicationDate: string): DjePublication[]` que divide o texto em publicações individuais usando o regex CNJ `\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}`
- DEVE exportar `extractCourt(block: string): string | null` que tenta identificar a vara ou câmara na linha imediatamente após o número do processo
- Publicações do caderno 3 DEVEM ter `instance: '1'`; do caderno 2 DEVEM ter `instance: '2'`
- Se o texto extraído não contiver nenhum número CNJ, `segmentPublications` DEVE retornar array vazio (não lançar exceção)
- DEVE criar fixtures de texto em `src/lib/dje/__fixtures__/` com exemplos reais de blocos de publicação do DJE/TJSP para uso nos testes
- O texto extraído DEVE ser limpo antes da segmentação: remover quebras de linha excessivas, normalizar espaços e garantir encoding UTF-8 correto
</requirements>

## Subtasks

- [x] 3.1 Baixar manualmente 1-2 cadernos reais do DJE/TJSP (usando o client da task_02) e inspecionar o texto extraído para entender a estrutura real das publicações — ajustar o algoritmo de segmentação e extração de vara conforme o que for encontrado
- [x] 3.2 Criar fixtures de texto em `src/lib/dje/__fixtures__/sample-caderno2.txt` e `sample-caderno3.txt` com blocos reais (anonimizados se necessário)
- [x] 3.3 Implementar `extractTextFromPdf` usando `pdf-parse`
- [x] 3.4 Implementar `segmentPublications` com o regex CNJ e lógica de extração de vara/câmara
- [x] 3.5 Implementar `extractCourt` com heurísticas de identificação de vara/câmara baseadas no padrão real do TJSP
- [x] 3.6 Escrever testes unitários usando as fixtures criadas em 3.2

## Implementation Details

Referencie a seção "Core Interfaces — Parser — segmentação de publicações" do TechSpec para a assinatura das funções e o algoritmo de segmentação.

Adicionar `pdf-parse` ao `package.json` é parte desta tarefa. O import deve ser `import pdfParse from 'pdf-parse'`.

A lógica de extração de vara/câmara (`extractCourt`) depende do padrão real do TJSP — a subtarefa 3.1 é mandatória antes de implementar 3.5. Padrões típicos esperados:
- Caderno 3 (1ª instância): "Nª Vara [Tipo] [Localidade]" (ex.: "15ª Vara Cível Central da Capital")
- Caderno 2 (2ª instância): "Nª Câmara de [Tipo]" (ex.: "8ª Câmara de Direito Privado")

Se o padrão real diferir significativamente, documentar no PR e ajustar o TechSpec.

### Relevant Files

- `src/lib/dje/parser.ts` — arquivo a criar
- `src/lib/dje/types.ts` (task_01) — importar `DjePublication`
- `src/lib/dje/__fixtures__/` — criar diretório com fixtures de texto
- `src/lib/dje/__tests__/parser.test.ts` — arquivo de teste a criar
- `package.json` — adicionar `pdf-parse` e `@types/pdf-parse`

### Dependent Files

- `src/inngest/dje-indexer.ts` (task_05) — chama `extractTextFromPdf` e `segmentPublications` no step de indexação

### Related ADRs

- [ADR-003: Biblioteca de Extração de PDF — pdf-parse](adrs/adr-003.md) — justifica a escolha do `pdf-parse` e documenta limitações
- [ADR-001: Estratégia de Indexação — Batch Diário com Histórico Persistido](adrs/adr-001.md) — o parser é o segundo passo do pipeline de indexação

## Deliverables

- `src/lib/dje/parser.ts` com `extractTextFromPdf`, `segmentPublications` e `extractCourt` exportados
- `src/lib/dje/__fixtures__/` com ao menos dois arquivos de texto de cadernos reais
- `pdf-parse` e `@types/pdf-parse` adicionados ao `package.json`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários (usando fixtures de texto real):
  - [x] `segmentPublications` com texto contendo 5 números CNJ retorna array com exatamente 5 `DjePublication`
  - [x] `segmentPublications` com texto vazio ou sem número CNJ retorna `[]`
  - [x] `segmentPublications` com `caderno: 3` → todas as publicações têm `instance: '1'`
  - [x] `segmentPublications` com `caderno: 2` → todas as publicações têm `instance: '2'`
  - [x] `segmentPublications` popula `publicationDate` com o valor passado como parâmetro
  - [x] `extractCourt` identifica "15ª Vara Cível Central da Capital" no bloco de texto do caderno 3
  - [x] `extractCourt` identifica "8ª Câmara de Direito Privado" no bloco de texto do caderno 2
  - [x] `extractCourt` retorna `null` quando nenhum padrão de vara/câmara é identificado
  - [x] `extractTextFromPdf` com buffer inválido (não é PDF) lança erro descritivo (não retorna string vazia silenciosamente)
- Testes de integração:
  - [ ] `extractTextFromPdf` aplicado a um buffer de PDF fixture real (arquivo `.pdf` em `__fixtures__/`) retorna string não vazia com ao menos um número CNJ
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Segmentação testada contra ao menos um caderno real baixado do TJSP
- `pnpm build` completo sem erros de tipagem relacionados ao `pdf-parse`
- `extractCourt` identifica corretamente a vara/câmara nos fixtures reais com taxa de acerto documentada (ex.: "identificou vara em 85% dos blocos testados")
