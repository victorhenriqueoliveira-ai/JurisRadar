---
status: completed
title: Importação automática de processos via Inngest + DataJud/PJe
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
  - task_05
---

# Task 07: Importação automática de processos via Inngest + DataJud/PJe

## Overview

Implementa o mecanismo central de importação e sincronização de processos: duas funções Inngest (scheduler e worker) que buscam processos por OAB/CPF no DataJud e PJe/Comunica, persistem na tabela `processos` e emitem eventos de notificação para movimentações novas. Esta é a feature de maior valor do produto — o que torna o JurisRadar único.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 2: Importação Automática de Processos") e o TechSpec (seções "Integration Points — DataJud/PJe" e "ADR-005") antes de começar
- REFERENCIE O TECHSPEC para o fluxo de dados do sync e as funções Inngest (`sync-processos-scheduler`, `sync-processos-worker`)
- FOQUE NO "QUÊ" — importar e persistir processos; o diff de movimentações é da task_11
- MINIMIZE CÓDIGO — reutilize integralmente `src/lib/datajud/client.ts` existente
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar função Inngest `sync-processos-scheduler` com cron `"0 3 * * *"` (3h BRT) que emite `processos/sync.requested` para cada advogado com assinatura ativa
- DEVE criar função Inngest `sync-processos-worker` que consome `processos/sync.requested` e busca processos no DataJud por OAB do advogado
- DEVE buscar também no PJe/Comunica (`comunicaapi.pje.jus.br`) por número CNJ dos processos já importados
- DEVE persistir processos novos em `processos` e movimentações em `movimentacoes` usando `ON CONFLICT DO NOTHING` na coluna `externo_id` para evitar duplicatas
- DEVE atualizar `processos.ultima_sync_at` após cada sync bem-sucedido
- DEVE criar endpoint `POST /api/processos/sync` para disparar sync manual via botão no CRM
- DEVE registrar falha de sync no processo (campo `ultima_sync_at` não atualizado + log estruturado)
- NUNCA processar advogados com `subscription.status not in ('trialing', 'active')`
- DEVE processar no máximo 10 processos por segundo por advogado para respeitar rate limits das APIs externas
</requirements>

## Subtasks

- [x] 7.1 Criar `src/inngest/sync-processos-scheduler.ts` com cron e fan-out por advogado ativo
- [x] 7.2 Criar `src/inngest/sync-processos-worker.ts` com step de busca DataJud por OAB
- [x] 7.3 Adicionar step de busca PJe/Comunica por número CNJ dos processos encontrados
- [x] 7.4 Implementar upsert de `processos` e insert com `ON CONFLICT DO NOTHING` em `movimentacoes`
- [x] 7.5 Criar `POST /api/processos/sync` para disparo manual e indicador de status no CRM
- [x] 7.6 Adicionar rate limiting de 10 processos/segundo com `step.sleep` entre lotes
- [x] 7.7 Escrever testes com mocks das APIs externas

## Implementation Details

Arquivos a criar:
- `src/inngest/sync-processos-scheduler.ts` — cron que faz fan-out por advogado
- `src/inngest/sync-processos-worker.ts` — worker de busca e persistência
- `src/app/api/processos/sync/route.ts` — endpoint de sync manual
- `src/lib/processos/upsert.ts` — lógica de upsert de processos e movimentações

Arquivos a modificar:
- `src/inngest/client.ts` (ou equivalente) — registrar as novas funções Inngest
- `src/lib/datajud/client.ts` — adicionar método de busca por OAB se não existir; reutilizar lógica de retry existente
- `src/app/api/djen-nacional/route.ts` — verificar se busca por número CNJ já está disponível; adaptar se necessário

Veja a seção "Integration Points — DataJud CNJ" e "Integration Points — PJe/Comunica" do TechSpec para detalhes de autenticação e tratamento de erros de cada API.

### Relevant Files

- `src/lib/datajud/client.ts` — cliente DataJud existente com retry e backoff; reutilizar integralmente
- `src/lib/datajud/query-builder.ts` — builder de queries; adicionar busca por OAB se ausente
- `src/app/api/djen-nacional/route.ts` — integração PJe/Comunica existente; extrair cliente para lib
- `src/inngest/` — funções Inngest existentes (DJe); seguir o mesmo padrão de estrutura
- `src/db/schema.ts` — tabelas `processos` e `movimentacoes` (criadas na task_02)

### Dependent Files

- `src/app/api/processos/route.ts` (task_08) — listará processos importados por esta task
- `src/inngest/sync-processos-worker.ts` (task_11) — o diff de movimentações usará o worker desta task como base
- `src/app/(app)/crm/page.tsx` (task_09) — exibirá indicador de última sincronização

### Related ADRs

- [ADR-005: Inngest para Worker de Monitoramento de Processos](adrs/adr-005.md) — Justifica Inngest e detalha a estrutura de funções

## Deliverables

- `sync-processos-scheduler.ts` com cron e fan-out
- `sync-processos-worker.ts` com busca DataJud + PJe e persistência
- `POST /api/processos/sync` funcional
- Testes com mocks das APIs externas com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `sync-processos-worker` com mock DataJud retornando 3 processos insere 3 registros em `processos`
  - [x] `sync-processos-worker` com processo já existente (mesmo `numero_cnj`) não duplica registro
  - [x] `sync-processos-worker` com mock DataJud retornando `DataJudRateLimitError` registra falha e não atualiza `ultima_sync_at`
  - [x] `sync-processos-scheduler` filtra advogados com `subscription.status = 'canceled'` e não emite eventos para eles
  - [x] Upsert de movimentação com mesmo `(processo_id, externo_id)` não lança erro (ON CONFLICT DO NOTHING)
- Testes de integração:
  - [x] `POST /api/processos/sync` sem autenticação retorna 401
  - [x] `POST /api/processos/sync` com usuário autenticado emite evento Inngest `processos/sync.requested`
  - [x] Após execução do worker com mock DataJud, `processos.ultima_sync_at` é atualizado
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Processos de dois advogados diferentes não se misturam no banco (isolamento por `org_id`)
- `DataJudRateLimitError` não causa crash do worker — apenas registra falha e continua
- Sync manual via botão no CRM funciona sem timeout (disparado de forma assíncrona via Inngest)
