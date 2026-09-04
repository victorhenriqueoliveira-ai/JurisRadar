---
status: completed
title: Templates de comunicação com cliente — buildWaLink + NotificacaoCliente.tsx
type: backend
complexity: medium
dependencies: []
---

# Task 18: Templates de comunicação com cliente — buildWaLink + NotificacaoCliente.tsx

## Overview

Cria o módulo `src/lib/comunicacao-cliente/` com duas saídas: a função pura `buildWaLink` que gera URLs wa.me com mensagem pré-preenchida, e o template React Email `NotificacaoCliente.tsx` para e-mails ao cliente enviados via Resend. Ambos são funções puras sem dependência de banco, o que permite desenvolvimento e teste em paralelo com a task_16.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- 1. DEVE criar `buildWaLink(telefone: string, mensagem: string): string` que retorna URL `https://wa.me/{numero_limpo}?text={mensagem_encoded}` com `encodeURIComponent`.
- 2. DEVE remover todos os caracteres não-numéricos do telefone antes de montar a URL.
- 3. DEVE criar template React Email `NotificacaoCliente.tsx` com variáveis: `clienteNome`, `processoNumCnj`, `tipoEvento`, `dataEvento`, `mensagemPersonalizada`, `nomeAdvogado`.
- 4. O template DEVE seguir o mesmo padrão visual dos templates existentes em `src/lib/email/templates/` (componentes `@react-email/components`).
- 5. DEVE exportar interface `EmailClienteParams` com todos os campos do template.
- 6. NÃO DEVE fazer chamadas a banco, Resend ou qualquer serviço externo — funções puras apenas.
</requirements>

## Subtasks

- [x] 18.1 Criar `src/lib/comunicacao-cliente/index.ts` com `buildWaLink` e interface `EmailClienteParams`
- [x] 18.2 Criar template `src/lib/email/templates/NotificacaoCliente.tsx` seguindo o padrão dos templates existentes
- [x] 18.3 Escrever testes unitários para `buildWaLink` (encoding, limpeza de telefone, casos de borda)
- [x] 18.4 Escrever testes de renderização para `NotificacaoCliente.tsx` seguindo padrão de `src/lib/email/__tests__/`

## Implementation Details

Ver seção "Core Interfaces" do TechSpec v2.0 para a assinatura de `buildWaLink` e `EmailClienteParams`. Ver seção "Integration Points — Resend — E-mail ao Cliente" para os requisitos do template.

Os templates existentes em `src/lib/email/templates/` usam `@react-email/components`. O novo template deve seguir o mesmo padrão (verificar `NotificacaoIntimacao.tsx` como referência de estrutura).

### Relevant Files

- `src/lib/email/templates/` — templates existentes para referência de padrão
- `src/lib/email/__tests__/templates.test.tsx` — padrão de teste de templates
- `src/inngest/notificacao-dispatcher.ts` — referência de como templates são usados com Resend

### Dependent Files

- `src/services/comunicacao-cliente.ts` — task_19 importará `buildWaLink` e `EmailClienteParams`
- `src/app/api/comunicacoes/email/route.ts` — task_19 usará o template `NotificacaoCliente`

### Related ADRs

- [ADR-009: Modelo de Dados de Cliente — Tabela Normalizada](../adrs/adr-009.md) — contexto de por que comunicação com cliente é registrada separadamente

## Deliverables

- `src/lib/comunicacao-cliente/index.ts` com `buildWaLink` e `EmailClienteParams`
- `src/lib/email/templates/NotificacaoCliente.tsx` compatível com Resend + React Email
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de renderização do template **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `buildWaLink('+55 (11) 99999-9999', 'Olá!')` retorna `https://wa.me/5511999999999?text=Ol%C3%A1!`
  - [ ] `buildWaLink('11999999999', 'texto com espaços')` retorna URL com espaços codificados como `%20`
  - [ ] `buildWaLink('', 'mensagem')` lança erro ou retorna string inválida identificável
  - [ ] `buildWaLink('+55119', 'msg')` retorna URL com apenas dígitos no número
  - [ ] Renderização de `NotificacaoCliente` com todos os campos preenchidos não lança erro e contém `clienteNome` no output HTML
  - [ ] Renderização de `NotificacaoCliente` com `mensagemPersonalizada` contendo caracteres especiais (HTML) não quebra o template
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `buildWaLink` gera URLs válidas para WhatsApp Web e app mobile
- Template `NotificacaoCliente` renderiza corretamente via `render()` do React Email
