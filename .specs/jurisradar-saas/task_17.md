---
status: completed
title: Busca avançada: adaptação SaaS, histórico e favoritos
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
---

# Task 17: Busca avançada: adaptação SaaS, histórico e favoritos

## Overview

Adapta a busca avançada existente do JurisRadar ao contexto SaaS: adiciona `org_id` ao histórico de buscas, implementa buscas favoritas salvas por nome e adiciona botão "Adicionar ao CRM" nos resultados para monitorar um processo encontrado.

<critical>
- SEMPRE LEIA o PRD (seção "Feature 8: Busca Avançada de Processos") e o TechSpec antes de começar
- REFERENCIE O TECHSPEC — esta task adapta código existente; não reescrever o que já funciona
- FOQUE NO "QUÊ" — adaptação SaaS + favoritos; a lógica de busca DataJud/DJe/PJe já existe
- MINIMIZE CÓDIGO — reutilize ao máximo as páginas `/protected/search`, `/protected/dje` e `/protected/djen-nacional` existentes
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE migrar as rotas de busca de `/protected/` para `/app/busca/` dentro do novo layout (app)
- DEVE adicionar `org_id` à tabela `searches` e `djeSearches` (migration já inclusa na task_02)
- DEVE salvar histórico de busca por usuário (últimas 50 buscas) filtrado por `org_id` e `user_id`
- DEVE implementar "Busca Favorita": salvar uma busca com nome personalizado; listar e reutilizar com um clique
- DEVE adicionar botão "Adicionar ao CRM" em cada resultado de processo; ao clicar, chama `POST /api/processos` para iniciar monitoramento
- DEVERIA exibir indicador "(já monitorado)" em processos que já existem no CRM do escritório
- NUNCA expor histórico de buscas de um usuário para outro usuário
</requirements>

## Subtasks

- [x] 17.1 Migrar rotas de busca para `/app/busca/` e adaptar ao novo layout (task_04)
- [x] 17.2 Adicionar `org_id` às queries de histórico de busca; limitar a 50 entradas por usuário
- [x] 17.3 Criar tabela/coluna de buscas favoritas e endpoints para salvar, listar e deletar favoritos
- [x] 17.4 Implementar UI de favoritos: botão "Salvar busca", lista de favoritos, clique para reaplicar
- [x] 17.5 Adicionar botão "Adicionar ao CRM" em cada card de resultado com feedback de "já monitorado"
- [x] 17.6 Escrever testes de histórico e favoritos

## Implementation Details

Arquivos a modificar:
- `src/app/(protected)/search/` → mover para `src/app/(app)/busca/datajud/`
- `src/app/(protected)/dje/` → mover para `src/app/(app)/busca/dje/`
- `src/app/(protected)/djen-nacional/` → mover para `src/app/(app)/busca/pje/`
- `src/app/api/datajud-search/route.ts` — adicionar `org_id` ao salvar em `searches`
- `src/app/api/dje-search/route.ts` — adicionar `org_id` ao salvar em `djeSearches`

Arquivos a criar:
- `src/app/(app)/busca/page.tsx` — hub de busca com tabs (DataJud, DJe, PJe)
- `src/app/api/busca/favoritos/route.ts` — GET listar, POST salvar, DELETE remover favorito
- `src/components/busca/BotaoAdicionarCRM.tsx` — botão com verificação de "já monitorado"

### Relevant Files

- `src/app/(protected)/search/page.tsx` — busca DataJud existente (migrar)
- `src/app/(protected)/dje/page.tsx` — busca DJe existente (migrar)
- `src/app/(protected)/djen-nacional/page.tsx` — busca PJe existente (migrar)
- `src/db/schema.ts` — tabelas `searches` e `djeSearches` (já têm `org_id` após task_02)

### Dependent Files

Nenhum — esta task é folha na árvore de dependências.

### Related ADRs

- [ADR-002: Multi-tenancy com Row-Level Isolation via org_id](adrs/adr-002.md) — histórico de buscas filtrado por `org_id` + `user_id`

## Deliverables

- Busca migrada para `/app/busca/` com layout correto
- Histórico por usuário com `org_id` e limite de 50 entradas
- Buscas favoritas: salvar, listar e reutilizar
- Botão "Adicionar ao CRM" nos resultados
- Testes com cobertura ≥80% **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Salvar 51ª busca remove a mais antiga (limite de 50 por usuário)
  - [ ] `GET /api/busca/favoritos` retorna apenas favoritos do usuário autenticado
  - [ ] `DELETE /api/busca/favoritos/:id` com ID de outro usuário retorna 403
- Testes de integração:
  - [ ] `BotaoAdicionarCRM` com processo já no CRM exibe "(já monitorado)" em vez do botão
  - [ ] Clicar "Adicionar ao CRM" chama `POST /api/processos` e exibe toast de confirmação
  - [ ] Histórico de busca do usuário A não aparece para o usuário B do mesmo escritório
- Meta de cobertura de testes: ≥80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes ≥80%
- Buscas existentes continuam funcionando após migração de rota
- Favoritos persistem entre sessões
- "Adicionar ao CRM" funciona sem recarregar a página
