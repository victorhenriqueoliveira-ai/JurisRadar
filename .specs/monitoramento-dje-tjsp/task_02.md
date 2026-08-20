---
status: completed
title: DJE Client — download de PDF com retry
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: DJE Client — download de PDF com retry

## Overview

Implementa `src/lib/dje/client.ts`, responsável por baixar o PDF de um caderno do DJE/TJSP para uma data específica. O módulo encapsula a URL de download, a lógica de retry com backoff exponencial e os tipos de erro, isolando o restante do sistema das particularidades do portal do TJSP.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE exportar `downloadCaderno(caderno: 2 | 3, date: string): Promise<Buffer>` onde `date` é no formato `YYYY-MM-DD`
- DEVE tentar o download até 3 vezes com delays crescentes de 5s, 15s e 45s (backoff exponencial) antes de lançar erro definitivo
- DEVE lançar `DjeUnavailableError` em resposta HTTP 5xx ou timeout de rede
- DEVE lançar `DjeNotFoundError` em resposta HTTP 404 (edição não disponível para a data)
- NÃO DEVE lançar exceção em respostas 4xx diferentes de 404 — deve lançar `DjeUnavailableError` com o status code
- A URL de download DEVE ser validada empiricamente contra um caderno real do TJSP antes de mergear — documentar a URL confirmada no arquivo
- DEVE logar início e conclusão do download com tamanho em bytes (estrutura de log: `[dje-client] download started`, `[dje-client] download completed`)
</requirements>

## Subtasks

- [x] 2.1 Investigar empiricamente a URL de download do DJE/TJSP com `curl` ou fetch manual para confirmar parâmetros necessários (ver Risco 1 do TechSpec)
- [x] 2.2 Implementar `src/lib/dje/client.ts` com a função `downloadCaderno` e os tipos de erro `DjeUnavailableError` e `DjeNotFoundError`
- [x] 2.3 Implementar retry com backoff usando o padrão de `src/lib/datajud/client.ts` como referência (sem copiar código — mesma estratégia, implementação própria para DJE)
- [x] 2.4 Escrever testes unitários com fetch mockado
- [x] 2.5 Testar manualmente o download de um caderno real e confirmar que o buffer retornado é um PDF válido (verificar magic bytes `%PDF`)

## Implementation Details

Referencie a seção "Integration Points — TJSP DJE Portal" do TechSpec para a URL de download, janela de disponibilidade e estratégia de retry.

O padrão de retry e tratamento de erros do DataJud em `src/lib/datajud/client.ts` é a referência arquitetural — analisar antes de implementar. A estrutura de erros customizados (`DjeUnavailableError extends Error`) DEVE seguir o mesmo padrão de `DataJudUnavailableError`.

A URL de download inferida é `https://dje.tjsp.jus.br/cdje/downloadCaderno.do?cdVolume=5&cdCaderno={2|3}&dtDiario={DD/MM/YYYY}`. Esta URL DEVE ser confirmada antes de considerar a tarefa concluída — pode exigir parâmetros adicionais ou sessão de browser.

### Relevant Files

- `src/lib/dje/client.ts` — arquivo a criar
- `src/lib/dje/types.ts` (task_01) — importar `DjeEditionStatus` e tipos de error
- `src/lib/datajud/client.ts` — referência de padrão de retry e error types (não modificar)

### Dependent Files

- `src/lib/dje/parser.ts` (task_03) — recebe o buffer retornado por `downloadCaderno`
- `src/inngest/dje-indexer.ts` (task_05) — chama `downloadCaderno` nos steps de download

### Related ADRs

- [ADR-001: Estratégia de Indexação — Batch Diário com Histórico Persistido](adrs/adr-001.md) — o client é o primeiro passo do pipeline de indexação descrito neste ADR

## Deliverables

- `src/lib/dje/client.ts` com `downloadCaderno`, `DjeUnavailableError` e `DjeNotFoundError` exportados
- URL de download confirmada empiricamente e documentada em comentário no arquivo
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários (fetch mockado via `vi.fn()` — padrão Vitest do projeto):
  - [x] `downloadCaderno(2, '2026-08-07')` monta URL com `cdCaderno=2` e `dtDiario=07/08/2026` corretamente
  - [x] `downloadCaderno(3, '2026-08-07')` monta URL com `cdCaderno=3`
  - [x] Fetch retornando HTTP 200 com body de PDF válido → retorna `Buffer` com magic bytes `%PDF`
  - [x] Fetch retornando HTTP 404 → lança `DjeNotFoundError` sem retry
  - [x] Fetch retornando HTTP 503 → tenta 3 vezes com delays crescentes e então lança `DjeUnavailableError`
  - [x] Fetch lançando `TypeError` (rede) → trata como falha retryable, tenta 3 vezes e lança `DjeUnavailableError`
  - [x] Após 3 falhas retryable, o erro final contém a mensagem da última tentativa
- Testes de integração:
  - [x] Download manual de caderno real da data atual (executado manualmente antes do merge, resultado documentado como comentário no PR)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- URL de download confirmada contra portal real do TJSP e documentada no código
- `downloadCaderno` retorna Buffer com magic bytes `%PDF` quando TJSP responde com caderno válido
- Erros são tipados (`DjeUnavailableError`, `DjeNotFoundError`) e propagam a causa raiz
