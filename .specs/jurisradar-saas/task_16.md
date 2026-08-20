---
status: pending
title: Módulo financeiro: honorários e pagamentos
type: frontend
complexity: high
dependencies:
  - task_04
  - task_08
  - task_09
---

# Task 16: Módulo financeiro: honorários e pagamentos

## Overview

Implementa o módulo financeiro básico: endpoints para registro de honorários e pagamentos por processo, dashboard financeiro com totais por período e interface integrada ao CRM (painel lateral do processo) e à página dedicada `/financeiro`.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 7: Módulo Financeiro") e o TechSpec (seção "API Endpoints — Financeiro") antes de começar
- REFERENCIE O TECHSPEC para o schema das tabelas `honorarios` e `pagamentos` e os endpoints `/api/financeiro`
- FOQUE NO "QUÊ" — registro de honorários e pagamentos; sem nota fiscal, sem integração contábil (fora de escopo)
- MINIMIZE CÓDIGO — reutilize `ProcessoSheet` (task_09) para integrar honorário no painel do processo
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE implementar `GET /api/financeiro` retornando: total a receber no mês, recebido no mês e em atraso — com filtro de período e responsável
- DEVE implementar `GET /api/financeiro/honorarios` listando honorários com filtros de status e período
- DEVE implementar `POST /api/financeiro/honorarios` para criar/atualizar honorário de um processo (um honorário por processo)
- DEVE implementar `POST /api/financeiro/honorarios/:id/pagamentos` para registrar parcelas pagas
- DEVE implementar `DELETE /api/financeiro/honorarios/:id/pagamentos/:pgId` para remover parcela
- DEVE calcular automaticamente `status_pagamento` (pendente/parcial/quitado) com base na soma dos pagamentos vs valor do honorário
- DEVE exibir honorário e pagamentos no `ProcessoSheet` (task_09) com formulário inline de registro
- DEVE criar página `/financeiro` com dashboard de totais e listagem de honorários filtráveis
- DEVE funcionar em mobile: formulários de pagamento como Sheet/Dialog
- NUNCA incluir NFS-e, integração contábil ou DRE (explicitamente fora de escopo no PRD)
</requirements>

## Subtasks

- [ ] 16.1 Criar endpoints `GET /api/financeiro`, `GET /api/financeiro/honorarios`, `POST /api/financeiro/honorarios`
- [ ] 16.2 Criar endpoints `POST /api/financeiro/honorarios/:id/pagamentos` e `DELETE .../pagamentos/:pgId`
- [ ] 16.3 Criar `src/services/financeiro.ts` com queries e cálculo automático de `status_pagamento`
- [ ] 16.4 Criar componente `HonorarioForm` para registro no painel do processo (integrar em `ProcessoSheet`)
- [ ] 16.5 Criar componente `PagamentoList` com botão de adicionar parcela e histórico de pagamentos
- [ ] 16.6 Criar página `/financeiro` com `DashboardFinanceiro` (totais) e `HonorarioTable` (listagem)
- [ ] 16.7 Escrever testes de cálculo de status e de endpoints

## Implementation Details

Arquivos a criar:
- `src/app/api/financeiro/route.ts` — GET dashboard financeiro
- `src/app/api/financeiro/honorarios/route.ts` — GET listagem + POST criar
- `src/app/api/financeiro/honorarios/[id]/pagamentos/route.ts` — POST registrar + DELETE remover
- `src/services/financeiro.ts` — queries e cálculo de status
- `src/components/financeiro/HonorarioForm.tsx`
- `src/components/financeiro/PagamentoList.tsx`
- `src/components/financeiro/DashboardFinanceiro.tsx`
- `src/components/financeiro/HonorarioTable.tsx`
- `src/app/(app)/financeiro/page.tsx` (substituir placeholder)

Arquivos a modificar:
- `src/components/crm/ProcessoSheet.tsx` (task_09) — adicionar seção de honorário com `HonorarioForm`

### Relevant Files

- `src/db/schema.ts` (task_02) — tabelas `honorarios` e `pagamentos`
- `src/lib/org-context.ts` (task_03) — `requireOrgContext()` em todos os endpoints
- `src/components/crm/ProcessoSheet.tsx` (task_09) — integrar `HonorarioForm`

### Dependent Files

Nenhum — esta task é folha na árvore de dependências de UI.

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — honorários filtrados por `org_id`

## Deliverables

- 5 endpoints financeiros implementados
- `HonorarioForm` integrado ao `ProcessoSheet`
- Página `/financeiro` com dashboard e listagem
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `calcularStatusPagamento(valorTotal=1000, pagamentos=[{valor:500}])` retorna `'parcial'`
  - [ ] `calcularStatusPagamento(valorTotal=1000, pagamentos=[{valor:1000}])` retorna `'quitado'`
  - [ ] `calcularStatusPagamento(valorTotal=1000, pagamentos=[])` retorna `'pendente'`
  - [ ] `POST /api/financeiro/honorarios` com `valor=-100` retorna 400
- Testes de integração:
  - [ ] `POST /api/financeiro/honorarios` cria honorário e retorna `status_pagamento: 'pendente'`
  - [ ] `POST .../pagamentos` com valor igual ao honorário atualiza `status_pagamento` para `'quitado'`
  - [ ] `DELETE .../pagamentos/:pgId` com ID de outro escritório retorna 403
  - [ ] `GET /api/financeiro` retorna `totalAReceber`, `totalRecebido`, `emAtraso` para o período solicitado
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- `status_pagamento` calculado automaticamente ao registrar ou remover parcela
- Honorário visível no painel lateral do processo (sem navegar para outra página)
- Dados financeiros de um escritório nunca visíveis para outro
