---
status: pending
title: Infraestrutura Base — Next.js + Neon + Drizzle
type: infra
complexity: medium
dependencies: []
---

# Task 01: Infraestrutura Base — Next.js + Neon + Drizzle

## Overview

Cria o projeto Next.js 14 com App Router e TypeScript, conecta ao banco Neon Postgres via Drizzle ORM, define as 4 tabelas do schema (`users`, `searches`, `search_results`, `search_cache`) e executa a migração inicial. Esta tarefa é a fundação de todo o sistema — nenhuma outra tarefa pode ser iniciada sem ela.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar projeto Next.js 14 com App Router, TypeScript strict e `src/` como diretório raiz.
- DEVE instalar e configurar `@neondatabase/serverless` como driver Postgres (HTTP pooling, compatível com Edge Runtime).
- DEVE instalar Drizzle ORM (`drizzle-orm`, `drizzle-kit`) e configurar `drizzle.config.ts` apontando para `src/db/schema.ts` e `src/db/migrations/`.
- DEVE definir as 4 tabelas exatamente como especificado na seção "Data Models" do TechSpec: `users`, `searches`, `search_results`, `search_cache`.
- DEVE criar índices obrigatórios: `searches(user_id, created_at DESC)`, `searches(cache_key)`, `search_results(search_id)`.
- DEVE executar `drizzle-kit generate` e `drizzle-kit migrate` para criar as tabelas no banco Neon.
- DEVE expor a instância do cliente Drizzle em `src/db/index.ts` para importação pelos demais módulos.
- DEVE configurar variável de ambiente `DATABASE_URL` no `.env.local` (com `.env.example` documentando as variáveis necessárias sem valores reais).
- DEVE instalar shadcn/ui e Tailwind CSS com configuração padrão (usados nas tarefas de frontend).
- DEVE criar script `pnpm db:migrate` no `package.json` para executar migrações.
- NÃO DEVE armazenar a `DATABASE_URL` real em arquivos versionados.
</requirements>

## Subtasks

- [ ] 1.1 Criar projeto Next.js 14 com App Router, TypeScript strict e estrutura de diretórios `src/`
- [ ] 1.2 Instalar dependências: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, `dotenv`
- [ ] 1.3 Criar `drizzle.config.ts` com schema e diretório de migrações apontados corretamente
- [ ] 1.4 Definir `src/db/schema.ts` com as 4 tabelas e índices conforme TechSpec (seção "Data Models")
- [ ] 1.5 Criar `src/db/index.ts` exportando a instância `db` usando `@neondatabase/serverless`
- [ ] 1.6 Executar `drizzle-kit generate` e `drizzle-kit migrate`; verificar tabelas criadas no Neon
- [ ] 1.7 Inicializar shadcn/ui com Tailwind CSS; verificar que `globals.css` e `tailwind.config.ts` estão corretos
- [ ] 1.8 Criar `.env.example` documentando todas as variáveis de ambiente do projeto

## Implementation Details

Consulte as seções **"Data Models"** e **"Technical Dependencies"** do TechSpec para os schemas Drizzle, tipos de campo, relações e índices obrigatórios.

A estrutura de diretórios esperada ao final desta tarefa:

```
src/
  app/
    layout.tsx
    page.tsx
  db/
    schema.ts        ← 4 tabelas + índices
    index.ts         ← instância db exportada
    migrations/      ← arquivos gerados pelo drizzle-kit
drizzle.config.ts
.env.example
```

### Relevant Files

- `src/db/schema.ts` — schema central; define todas as tabelas usadas pelo sistema
- `src/db/index.ts` — ponto único de importação do cliente de banco
- `src/db/migrations/` — arquivos SQL gerados pelo drizzle-kit
- `drizzle.config.ts` — configuração do drizzle-kit (schema path, migrations path, driver)
- `.env.example` — template de variáveis de ambiente para o time

### Dependent Files

- `src/auth.ts` (task_02) — importa `db` para validar credenciais
- `src/inngest/federated-search.ts` (task_04) — importa `db` para persistir progresso
- `src/app/api/searches/route.ts` (task_05) — importa `db` para CRUD de buscas
- `src/lib/datajud/client.ts` (task_03) — importa tipos de `schema.ts`

### Related ADRs

- [ADR-002: Banco de Dados e ORM — Neon + Drizzle ORM](adrs/adr-002.md) — justifica a escolha do driver HTTP serverless e do Drizzle em detrimento do Prisma

## Deliverables

- Projeto Next.js 14 inicializado com App Router e TypeScript strict
- `src/db/schema.ts` com as 4 tabelas e índices corretos
- Migração executada com sucesso no banco Neon (tabelas visíveis no dashboard Neon)
- `src/db/index.ts` exportando cliente `db` funcional
- shadcn/ui + Tailwind CSS inicializados
- `.env.example` com todas as variáveis documentadas
- Testes de schema com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Verificar que `src/db/index.ts` exporta uma instância `db` não-nula ao receber `DATABASE_URL` válida
  - [ ] Verificar que a ausência de `DATABASE_URL` lança erro descritivo na inicialização do cliente
  - [ ] Verificar que `SearchFilters` (tipo JSONB) pode ser serializado e desserializado sem perda de campos
- Testes de integração:
  - [ ] Inserir uma linha em cada tabela (`users`, `searches`, `search_results`, `search_cache`) e verificar que a leitura retorna os mesmos dados
  - [ ] Verificar que a constraint de FK entre `search_results.search_id` e `searches.id` rejeita IDs inexistentes
  - [ ] Verificar que `ON DELETE CASCADE` em `search_results` remove resultados ao deletar a busca pai
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `pnpm db:migrate` executa sem erros em ambiente limpo
- As 4 tabelas existem no banco Neon com os índices corretos (verificável via `drizzle-kit studio` ou psql)
- `pnpm dev` sobe o servidor Next.js sem erros de compilação
