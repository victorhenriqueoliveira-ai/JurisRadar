---
status: completed
title: Alertas de prazo via Inngest (T-5, T-2, T-1)
type: backend
complexity: medium
dependencies:
  - task_11
  - task_14
---

# Task 15: Alertas de prazo via Inngest (T-5, T-2, T-1)

## Overview

Implementa a função Inngest `alertas-prazo` que roda diariamente, verifica eventos processuais com prazo próximo e envia notificações in-app + e-mail nos marcos T-5, T-2 e T-1 dias, marcando cada alerta enviado para evitar duplicatas.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 6: Calendário Processual") e o TechSpec (seção "Build Order passo 15") antes de começar
- REFERENCIE O TECHSPEC para os campos `alertado_t5`, `alertado_t2`, `alertado_t1` na tabela `eventos_calendario`
- FOQUE NO "QUÊ" — cron de alertas; templates de e-mail já existem na task_12
- MINIMIZE CÓDIGO — reutilizar `notificacao-dispatcher` (task_11) emitindo evento `notificacao/nova`
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar função Inngest `alertas-prazo` com cron `"0 8 * * *"` (8h BRT)
- DEVE consultar `eventos_calendario` buscando eventos com `data = hoje + 5`, `hoje + 2` e `hoje + 1` dias respectivamente
- DEVE verificar flags `alertado_t5`, `alertado_t2`, `alertado_t1` antes de enviar; não reenviar alerta já enviado
- DEVE emitir `notificacao/nova` para cada prazo não alertado, que será processado pelo `notificacao-dispatcher` (task_11)
- DEVE atualizar as flags `alertado_t5/t2/t1` para `true` após emitir o evento
- DEVE respeitar as preferências de notificação do usuário (definidas na task_11)
- NUNCA enviar alerta para processo arquivado (`arquivado_at IS NOT NULL`)
</requirements>

## Subtasks

- [x] 15.1 Criar `src/inngest/alertas-prazo.ts` com cron `"0 8 * * *"`
- [x] 15.2 Implementar query de eventos por data (T-5, T-2, T-1) com filtro de flags não enviadas
- [x] 15.3 Implementar emit de `notificacao/nova` por evento encontrado
- [x] 15.4 Implementar atualização atômica das flags `alertado_t*` após emit
- [x] 15.5 Registrar função no cliente Inngest
- [x] 15.6 Escrever testes com mock de data e banco

## Implementation Details

Arquivos a criar:
- `src/inngest/alertas-prazo.ts` — função Inngest com cron diário

Arquivos a modificar:
- `src/inngest/client.ts` — registrar `alertas-prazo`

Veja a seção "Data Models — eventos_calendario" do TechSpec para os campos de flag: `alertado_t5 bool DEFAULT false`, `alertado_t2 bool DEFAULT false`, `alertado_t1 bool DEFAULT false`.

### Relevant Files

- `src/db/schema.ts` (task_02) — tabela `eventos_calendario` com flags de alerta
- `src/inngest/notificacao-dispatcher.ts` (task_11) — consumirá `notificacao/nova` emitido por esta função
- `src/lib/email/templates/AlertaPrazo.tsx` (task_12) — template de e-mail usado pelo dispatcher

### Dependent Files

Nenhum — esta task é folha na árvore de dependências de backend.

### Related ADRs

- [ADR-005: Inngest para Worker de Monitoramento de Processos](adrs/adr-005.md) — padrão de funções Inngest

## Deliverables

- `src/inngest/alertas-prazo.ts` funcional com cron e atualização de flags
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Função com evento em `data = hoje + 5` e `alertado_t5 = false` emite `notificacao/nova` e seta `alertado_t5 = true`
  - [x] Função com evento em `data = hoje + 5` e `alertado_t5 = true` não emite evento duplicado
  - [x] Função com processo arquivado (`arquivado_at IS NOT NULL`) não emite alerta mesmo com prazo próximo
  - [x] Função com evento em `data = hoje + 2` e `alertado_t2 = false` emite alerta T-2
- Testes de integração:
  - [x] Execução da função com banco contendo 3 eventos em T-5 emite 3 eventos `notificacao/nova`
  - [x] Segunda execução no mesmo dia não emite eventos duplicados (flags já estão `true`)
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Mesmo prazo nunca gera dois alertas no mesmo marco T (idempotência via flags)
- Processos arquivados não recebem alertas
