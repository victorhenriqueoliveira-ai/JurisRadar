---
status: pending
title: Autenticação — NextAuth.js v5 + Middleware + Tela de Login
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Autenticação — NextAuth.js v5 + Middleware + Tela de Login

## Overview

Implementa a camada de autenticação multi-usuário do JurisRadar usando NextAuth.js v5 com Credentials Provider (e-mail + senha), sessions JWT armazenadas em cookie HTTP-only, e middleware de proteção de rotas. Inclui a tela de login e um script de seed para criar contas administrativamente. Toda rota do sistema (exceto `/login` e webhooks) fica inacessível sem sessão válida.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE instalar `next-auth@beta` (NextAuth.js v5) e `bcryptjs` com seus tipos TypeScript.
- DEVE configurar `src/auth.ts` com Credentials Provider validando e-mail + senha contra a tabela `users` do banco com hash bcrypt.
- DEVE usar JWT sessions (stateless) — sem tabela de sessões no banco.
- DEVE criar `middleware.ts` na raiz do projeto com matcher que protege todas as rotas exceto `/login`, `/api/auth/*` e `/api/inngest`.
- DEVE criar rota NextAuth em `src/app/api/auth/[...nextauth]/route.ts`.
- DEVE criar página de login em `src/app/(auth)/login/page.tsx` com formulário de e-mail + senha usando shadcn/ui; erro de credenciais inválidas exibido ao usuário.
- DEVE criar script `pnpm db:seed` que insere usuários iniciais com senha hasheada (lê de variável de ambiente ou arquivo de seed).
- DEVE expor variável `AUTH_SECRET` (gerada via `npx auth secret`) no `.env.example`.
- NÃO DEVE permitir autoregistro — apenas o seed cria usuários no MVP.
- NÃO DEVE armazenar senhas em texto plano em nenhuma circunstância.
- NÃO DEVE redirecionar `/api/inngest` para login (rota pública de webhook).
</requirements>

## Subtasks

- [ ] 2.1 Instalar `next-auth@beta`, `bcryptjs` e `@types/bcryptjs`
- [ ] 2.2 Criar `src/auth.ts` com Credentials Provider e validação contra tabela `users`
- [ ] 2.3 Criar rota `src/app/api/auth/[...nextauth]/route.ts` exportando handlers GET/POST
- [ ] 2.4 Criar `middleware.ts` com matcher excluindo rotas públicas
- [ ] 2.5 Criar página de login `src/app/(auth)/login/page.tsx` com formulário shadcn/ui e tratamento de erro
- [ ] 2.6 Criar script `src/db/seed.ts` e adicionar `pnpm db:seed` ao `package.json`
- [ ] 2.7 Adicionar `AUTH_SECRET` ao `.env.example`

## Implementation Details

Consulte as seções **"Integration Points — Inngest"** e **"System Architecture — Component Overview"** do TechSpec para entender quais rotas devem ser excluídas do middleware.

Consulte o ADR-003 para a justificativa da escolha do NextAuth.js v5 e do modelo de JWT stateless.

O grupo de rotas `(auth)` usa layout sem proteção; o grupo `(protected)` herda a proteção do middleware.

### Relevant Files

- `src/auth.ts` — configuração central do NextAuth.js v5
- `middleware.ts` — proteção de rotas (raiz do projeto, não dentro de `src/`)
- `src/app/api/auth/[...nextauth]/route.ts` — handlers HTTP do NextAuth
- `src/app/(auth)/login/page.tsx` — tela de login
- `src/db/seed.ts` — script de criação de usuários iniciais

### Dependent Files

- `src/app/api/searches/route.ts` (task_05) — usa `auth()` para obter `userId` da sessão
- `src/app/(protected)/search/page.tsx` (task_07) — acessa `session.user` via `auth()`
- `src/app/(protected)/history/page.tsx` (task_08) — acessa `session.user` via `auth()`

### Related ADRs

- [ADR-003: Autenticação — NextAuth.js v5 com Credentials Provider](adrs/adr-003.md) — justifica JWT stateless, Credentials provider e ausência de autoregistro no MVP

## Deliverables

- `src/auth.ts` funcional com Credentials Provider e bcrypt
- `middleware.ts` protegendo todas as rotas exceto as públicas listadas
- Página `/login` com formulário e tratamento de erro de credenciais inválidas
- Script `pnpm db:seed` criando ao menos um usuário de teste
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração de autenticação **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Credentials provider com e-mail e senha corretos retorna objeto `user` com `id` e `email`
  - [ ] Credentials provider com senha incorreta retorna `null` (não lança exceção)
  - [ ] Credentials provider com e-mail inexistente retorna `null`
  - [ ] `bcryptjs.compare` de senha correta retorna `true`; de senha incorreta retorna `false`
- Testes de integração:
  - [ ] `POST /api/auth/callback/credentials` com credenciais válidas retorna cookie de sessão JWT
  - [ ] `GET /api/searches` sem cookie de sessão retorna `401`
  - [ ] `GET /api/searches` com cookie JWT válido não redireciona para login
  - [ ] `GET /api/inngest` (rota pública) não é redirecionada para login mesmo sem sessão
  - [ ] Acesso a `/search` sem sessão redireciona para `/login`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `pnpm db:seed` cria usuário no banco e o login com esse usuário retorna sessão válida
- Todas as rotas `/api/searches/*` retornam 401 sem cookie de sessão
- `/api/inngest` acessível sem autenticação
- Página `/login` exibe mensagem de erro ao inserir credenciais inválidas
