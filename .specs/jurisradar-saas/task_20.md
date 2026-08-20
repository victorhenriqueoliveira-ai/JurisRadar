---
status: pending
title: Gestão de escritório e membros: convites e papéis
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
  - task_09
---

# Task 20: Gestão de escritório e membros: convites e papéis

## Overview

Implementa a área de configurações do escritório: endpoints e UI para convidar membros por e-mail, alterar papéis (sócio/associado/estagiário) e remover membros. Apenas sócios têm acesso a estas ações.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 1: Onboarding e Gestão de Contas") e o TechSpec (seção "API Endpoints — Organização e membros") antes de começar
- REFERENCIE O TECHSPEC para os 7 endpoints de `/api/organizacoes/me/`
- FOQUE NO "QUÊ" — gestão de membros; a criação do escritório já ocorre no cadastro (task_03)
- MINIMIZE CÓDIGO — use shadcn/ui Table, Dialog e Select para a interface de membros
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE implementar `GET /api/organizacoes/me` e `PATCH /api/organizacoes/me` para dados do escritório
- DEVE implementar `GET /api/organizacoes/me/membros` listando todos os membros com papel e data de entrada
- DEVE implementar `POST /api/organizacoes/me/membros` para convidar membro por e-mail com papel pré-definido; envia e-mail de convite via `ConviteMembro.tsx` (task_06)
- DEVE implementar `PATCH /api/organizacoes/me/membros/:id` para alterar papel; sócio não pode rebaixar a si mesmo
- DEVE implementar `DELETE /api/organizacoes/me/membros/:id` para remover membro; sócio não pode se auto-remover se for o único sócio
- DEVE criar página `/configuracoes/escritorio` com: dados do escritório (editáveis pelo sócio) e tabela de membros
- DEVE exibir formulário de convite com campo de e-mail e select de papel
- TODOS os endpoints DEVEM ser restritos a papel `socio`
</requirements>

## Subtasks

- [ ] 20.1 Criar endpoints `GET/PATCH /api/organizacoes/me` e `GET/POST /api/organizacoes/me/membros`
- [ ] 20.2 Criar endpoints `PATCH/DELETE /api/organizacoes/me/membros/:id`
- [ ] 20.3 Integrar envio de e-mail de convite via `ConviteMembro.tsx` (task_06) no endpoint de convite
- [ ] 20.4 Criar página `/configuracoes/escritorio` com dados do escritório e tabela de membros
- [ ] 20.5 Criar componente `ConviteDialog` com formulário de e-mail e select de papel
- [ ] 20.6 Implementar proteção: sócio não pode rebaixar/remover a si mesmo se for o único sócio
- [ ] 20.7 Escrever testes dos endpoints e das regras de negócio de auto-remoção

## Implementation Details

Arquivos a criar:
- `src/app/api/organizacoes/me/route.ts` — GET + PATCH dados do escritório
- `src/app/api/organizacoes/me/membros/route.ts` — GET listagem + POST convite
- `src/app/api/organizacoes/me/membros/[id]/route.ts` — PATCH papel + DELETE remover
- `src/components/configuracoes/MembrosTable.tsx`
- `src/components/configuracoes/ConviteDialog.tsx`
- `src/app/(app)/configuracoes/escritorio/page.tsx`

Arquivos a modificar:
- `src/lib/email/send.ts` (task_06) — enviar `ConviteMembro` ao convidar membro

### Relevant Files

- `src/db/schema.ts` (task_02) — tabelas `organizations` e `org_members`
- `src/lib/org-context.ts` (task_03) — `requireRole(ctx, 'socio')` obrigatório em mutações
- `src/lib/email/templates/ConviteMembro.tsx` (task_06) — template de e-mail de convite

### Dependent Files

Nenhum — esta task é folha na árvore de dependências.

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — operações de membros sempre escopadas ao `org_id` da sessão

## Deliverables

- 5 endpoints de gestão de membros implementados
- Página `/configuracoes/escritorio` com tabela de membros e formulário de convite
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `PATCH /api/organizacoes/me/membros/:id` com papel `associado` tentando chamar o endpoint retorna 403
  - [ ] `DELETE /api/organizacoes/me/membros/:id` onde o membro é o único sócio retorna 400 com mensagem "Escritório deve ter ao menos um sócio"
  - [ ] `PATCH /api/organizacoes/me/membros/:id` para rebaixar o próprio usuário de sócio para associado retorna 400
- Testes de integração:
  - [ ] `POST /api/organizacoes/me/membros` com e-mail válido cria registro em `org_members` com status `pendente` e dispara e-mail de convite
  - [ ] `GET /api/organizacoes/me/membros` retorna apenas membros do escritório do usuário autenticado
  - [ ] `DELETE /api/organizacoes/me/membros/:id` com ID de membro de outro escritório retorna 403
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- E-mail de convite enviado automaticamente ao adicionar membro
- Sócio único não consegue se auto-remover ou rebaixar (regra de negócio validada no backend)
- Membros de outro escritório nunca visíveis na listagem
