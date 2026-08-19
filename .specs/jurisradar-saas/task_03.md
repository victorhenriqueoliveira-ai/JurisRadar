---
status: completed
title: Auth expandido: CPF, OAB, organizations, papéis e 2FA
type: backend
complexity: high
dependencies:
  - task_02
---

# Task 03: Auth expandido: CPF, OAB, organizations, papéis e 2FA

## Overview

Expande o sistema de autenticação NextAuth.js existente para suportar cadastro com CPF e OAB, criação automática de organização no primeiro acesso, inclusão de `orgId`, `role` e `subscriptionStatus` no JWT, e 2FA opcional via TOTP. Esta tarefa é o pré-requisito de todo o controle de acesso do SaaS.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 1: Onboarding e Gestão de Contas") e o TechSpec (seções "Core Interfaces" e "Build Order passo 3") antes de começar
- REFERENCIE O TECHSPEC para a interface `OrgContext` e o helper `requireOrgContext()`
- FOQUE NO "QUÊ" — expandir auth e JWT; não construir UI de onboarding (task_18)
- MINIMIZE CÓDIGO — reutilize o Credentials provider existente; apenas adicione campos e callbacks
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar campos `cpf`, `oab_numero`, `oab_estado` ao formulário de cadastro e à tabela `users`
- DEVE criar organização automaticamente para o primeiro usuário de um escritório ao cadastrar; vincular como sócio em `org_members`
- DEVE incluir `orgId`, `role` e `subscriptionStatus` no JWT callback do NextAuth para evitar consulta ao banco em cada request
- DEVE criar `src/lib/org-context.ts` com `requireOrgContext()` e `requireRole()` conforme interface do TechSpec
- DEVE atualizar `next-auth.d.ts` com os novos campos na interface `Session` e `JWT`
- DEVE suportar 2FA via TOTP (Google Authenticator): geração de `totp_secret`, QR code e verificação de código de 6 dígitos
- DEVE redirecionar para `/onboarding` após primeiro login de usuário sem org completo
- DEVE validar CPF com algoritmo de dígitos verificadores; OAB no formato `{estado}{numero}` (ex: SP123456)
- NUNCA expor CPF ou OAB em respostas de API ou logs
</requirements>

## Subtasks

- [x] 3.1 Adicionar campos CPF e OAB à action de registro; validar CPF e formato OAB
- [x] 3.2 Criar organização e vínculo sócio automaticamente ao registrar primeiro usuário do escritório
- [x] 3.3 Incluir `orgId`, `role` e `subscriptionStatus` no JWT callback e atualizar `next-auth.d.ts`
- [x] 3.4 Criar `src/lib/org-context.ts` com `requireOrgContext()` e `requireRole()`
- [x] 3.5 Implementar 2FA TOTP: geração de secret, endpoint de QR code e verificação no login
- [x] 3.6 Atualizar `middleware.ts` para redirecionar `/onboarding` quando `orgId` ausente no JWT
- [x] 3.7 Escrever testes unitários para validação de CPF, OAB e lógica de controle de acesso

## Implementation Details

Arquivos a modificar:
- `src/auth.ts` — adicionar campos ao Credentials provider; expandir `jwt` e `session` callbacks
- `src/app/login/page.tsx` e `src/app/login/actions.ts` — adicionar campos CPF/OAB ao cadastro
- `middleware.ts` — adicionar verificação de `orgId` e redirecionar para `/onboarding` quando ausente
- `next-auth.d.ts` — declarar `orgId`, `role`, `subscriptionStatus` na interface `Session`

Arquivos a criar:
- `src/lib/org-context.ts` — helpers `requireOrgContext()` e `requireRole()`
- `src/lib/auth/totp.ts` — geração de secret TOTP, QR code URL e verificação de código
- `src/lib/auth/cpf.ts` — validação de CPF com algoritmo de dígitos verificadores
- `src/app/api/auth/totp/setup/route.ts` — endpoint para gerar QR code
- `src/app/api/auth/totp/verify/route.ts` — endpoint para verificar código TOTP

Veja as seções "Core Interfaces" e "Build Order passo 3" do TechSpec para os tipos exatos de `OrgContext` e os helpers de contexto.

### Relevant Files

- `src/auth.ts` — configuração NextAuth existente com Credentials provider e JWT strategy
- `src/db/schema.ts` — tabela `users` (após task_02: tem `cpf`, `oab_numero`, `oab_estado`, `totp_secret`) e `org_members`
- `middleware.ts` — proteção de rotas existente; expandir com verificação de org
- `src/lib/system-user.ts` — utilitário existente para obter usuário autenticado; alinhar com novo helper

### Dependent Files

- `src/app/(app)/layout.tsx` (task_04) — consumirá `session.user.orgId` e `session.user.role`
- `src/app/api/billing/webhook/route.ts` (task_05) — atualizará `subscriptionStatus` no JWT via re-sign
- Todos os Route Handlers e Server Actions (tasks_07–20) — consumirão `requireOrgContext()`

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — `requireOrgContext()` é a implementação central do isolamento

## Deliverables

- `src/auth.ts` com JWT expandido (`orgId`, `role`, `subscriptionStatus`)
- `src/lib/org-context.ts` com `requireOrgContext()` e `requireRole()`
- `src/lib/auth/totp.ts` com geração e verificação de TOTP
- `src/lib/auth/cpf.ts` com validação de CPF
- Endpoints `/api/auth/totp/setup` e `/api/auth/totp/verify`
- `next-auth.d.ts` atualizado
- Testes unitários com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `validateCpf("000.000.000-00")` retorna `false`; CPF válido retorna `true`
  - [ ] `validateCpf` com CPF de todos os dígitos iguais (ex: "111.111.111-11") retorna `false`
  - [ ] `requireOrgContext()` com sessão válida contendo `orgId` retorna `OrgContext` correto
  - [ ] `requireOrgContext()` com sessão sem `orgId` lança `UnauthorizedError`
  - [ ] `requireRole(ctx, 'socio')` com `ctx.role = 'estagiario'` lança `ForbiddenError`
  - [ ] `requireRole(ctx, 'estagiario')` com qualquer papel retorna sem erro
  - [ ] `verifyTotp(secret, codigoValido)` retorna `true`; código expirado retorna `false`
- Testes de integração:
  - [ ] `POST /api/auth/register` com CPF inválido retorna 400 com mensagem "CPF inválido"
  - [ ] `POST /api/auth/register` com dados válidos cria usuário + organização + membro sócio em uma transação
  - [ ] Login de usuário com 2FA ativo e código TOTP correto retorna sessão; código errado retorna 401
  - [ ] JWT decodificado após login contém `orgId`, `role` e `subscriptionStatus` não nulos
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- CPF e OAB nunca aparecem em logs da aplicação ou respostas de erro
- Usuário sem `orgId` no JWT é redirecionado para `/onboarding` pelo middleware
- 2FA funciona com Google Authenticator (QR code escaneável e código verificável)
