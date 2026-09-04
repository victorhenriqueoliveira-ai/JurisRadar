---
status: completed
title: ComunicacaoClienteService + API /api/comunicacoes/* e /api/clientes
type: backend
complexity: high
dependencies:
  - task_16
  - task_18
---

# Task 19: ComunicacaoClienteService + API /api/comunicacoes/* e /api/clientes

## Overview

Implementa o serviço de comunicação com cliente e as rotas de API que permitem ao advogado notificar clientes via e-mail (Resend) ou WhatsApp (wa.me), registrar o histórico em `comunicacoes_cliente` e gerenciar a entidade `clientes` com upsert seguro. Este é o backend completo do fluxo de comunicação do CRM hub.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- 1. DEVE criar `src/services/comunicacao-cliente.ts` com métodos `registrar(input)` e `listarPorProcesso(processoId, orgId)` — ver interface `ComunicacaoClienteService` no TechSpec.
- 2. DEVE criar `POST /api/comunicacoes/email` que envia e-mail via Resend com template `NotificacaoCliente` e registra em `comunicacoes_cliente`.
- 3. DEVE criar `POST /api/comunicacoes/whatsapp-link` que registra a intenção de comunicação em `comunicacoes_cliente` e retorna a URL wa.me.
- 4. DEVE criar `GET /api/processos/[id]/comunicacoes` que retorna histórico paginado de comunicações do processo.
- 5. DEVE criar `POST /api/clientes` com upsert por `(org_id, cpf_cnpj)` — conflito atualiza `nome`, `email`, `whatsapp`.
- 6. TODAS as rotas DEVEM usar `requireOrgContext()` — padrão multi-tenant do projeto.
- 7. Falha no envio via Resend DEVE ser logada estruturalmente mas NÃO DEVE impedir o registro em `comunicacoes_cliente`.
- 8. DEVE validar que `processoId` pertence ao `org_id` do usuário autenticado antes de registrar comunicação.
</requirements>

## Subtasks

- [ ] 19.1 Criar `src/services/comunicacao-cliente.ts` com `registrar` e `listarPorProcesso`
- [ ] 19.2 Criar `POST /api/comunicacoes/email` com envio Resend + registro no histórico
- [ ] 19.3 Criar `POST /api/comunicacoes/whatsapp-link` com geração de URL wa.me + registro
- [ ] 19.4 Criar `GET /api/processos/[id]/comunicacoes` com listagem paginada
- [ ] 19.5 Criar `POST /api/clientes` com lógica de upsert por `(org_id, cpf_cnpj)`
- [ ] 19.6 Escrever testes unitários do service e testes de integração das rotas

## Implementation Details

Ver seções "Core Interfaces — ComunicacaoClienteService", "API Endpoints — Comunicação com Cliente" e "Integration Points — Resend — E-mail ao Cliente" do TechSpec v2.0.

O padrão de route handlers do projeto usa `requireOrgContext()` de `src/lib/org-context.ts`. Usar Resend via `src/lib/email/resend.ts` já existente. O `buildWaLink` vem de `src/lib/comunicacao-cliente/` (task_18).

### Relevant Files

- `src/lib/org-context.ts` — `requireOrgContext()` obrigatório em toda rota
- `src/lib/email/resend.ts` — cliente Resend já configurado
- `src/lib/email/send.ts` — helper de envio de e-mail
- `src/db/schema.ts` — tabelas `clientes` e `comunicacoes_cliente` (task_16)
- `src/app/api/asaas/cobrancas/route.ts` — referência de padrão de route handler com Asaas

### Dependent Files

- `src/components/crm/ProcessoSheet.tsx` — task_23 consumirá `GET /api/processos/[id]/comunicacoes`
- `src/components/financeiro/RelatorioInadimplentes.tsx` — usará `POST /api/comunicacoes/whatsapp-link` e `POST /api/comunicacoes/email`

### Related ADRs

- [ADR-009: Modelo de Dados de Cliente — Tabela Normalizada](../adrs/adr-009.md) — justifica upsert por `(org_id, cpf_cnpj)`

## Deliverables

- `src/services/comunicacao-cliente.ts` com service completo
- Rotas `POST /api/comunicacoes/email`, `POST /api/comunicacoes/whatsapp-link`, `GET /api/processos/[id]/comunicacoes`, `POST /api/clientes`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para o fluxo completo de comunicação **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `registrar` com `canal='email'` e Resend mockado cria registro em `comunicacoes_cliente` mesmo quando Resend lança exceção
  - [ ] `listarPorProcesso` com `processoId` de outro `org_id` retorna lista vazia (isolamento multi-tenant)
  - [ ] `POST /api/comunicacoes/email` sem `clienteId` no body retorna 400
  - [ ] `POST /api/comunicacoes/whatsapp-link` com telefone válido retorna `{ url, comunicacaoId }` com URL no formato `https://wa.me/...`
  - [ ] `POST /api/clientes` com `cpf_cnpj` já existente no mesmo `org_id` atualiza `nome` e `email` sem criar duplicata
  - [ ] `POST /api/clientes` com `cpf_cnpj` já existente em outro `org_id` cria novo registro
- Testes de integração:
  - [ ] Fluxo completo: `POST /api/clientes` → `POST /api/comunicacoes/email` → `GET /api/processos/[id]/comunicacoes` retorna a mensagem enviada com `canal='email'`
  - [ ] `GET /api/processos/[id]/comunicacoes` com `processoId` de outro escritório retorna 403
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- E-mail enviado via Resend e registrado em `comunicacoes_cliente` em um único fluxo
- URL wa.me gerada corretamente e intenção registrada mesmo sem confirmação de entrega
- Upsert de cliente sem duplicatas por `(org_id, cpf_cnpj)`
