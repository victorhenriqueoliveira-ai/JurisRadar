---
status: completed
title: Fix POST /api/calendario/eventos — erros descritivos
type: bugfix
complexity: low
dependencies: []
---

# Task 03: Fix `POST /api/calendario/eventos` — erros descritivos

## Overview
A rota de criação de evento retorna "Erro interno" genérico para qualquer falha, impedindo o usuário de entender o problema e o time de depurar a causa. Esta tarefa identifica a causa raiz do erro 500, corrige-a e substitui o catch genérico por mensagens descritivas mapeadas por tipo de erro.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE logar o erro real com `console.error` antes de retornar qualquer status 500
- DEVE retornar mensagem descritiva para cada tipo de falha (ver TechSpec > API Endpoints > POST /api/calendario/eventos)
- DEVE manter os dados do formulário no cliente após erro (não é responsabilidade da API — verificar se o frontend já preserva o estado)
- NÃO DEVE expor stack trace ou detalhes internos do banco na resposta HTTP
- DEVE retornar 201 com o evento criado em caso de sucesso
</requirements>

## Subtasks
- [x] 3.1 Adicionar `console.error('[calendario/eventos POST]', error)` no catch para revelar a causa raiz
- [x] 3.2 Investigar o erro real a partir dos logs e corrigir a causa raiz
- [x] 3.3 Mapear tipos de erro para mensagens descritivas conforme tabela do TechSpec
- [x] 3.4 Verificar se o formulário no frontend (`CalendarioProcessual.tsx` ou similar) preserva os dados após erro
- [x] 3.5 Escrever testes para os caminhos de erro e sucesso

## Implementation Details
Arquivo a modificar: `src/app/api/calendario/eventos/route.ts`

O handler POST atual tem try-catch genérico na linha ~71. A causa raiz do 500 é desconhecida e será revelada pelo log no passo 3.1. Possíveis causas: constraint de banco, campo de data com tipo incompatível, `orgId` null.

Ver TechSpec > API Endpoints > "MODIFICADO — POST /api/calendario/eventos" para a tabela completa de mapeamento de erros.

### Relevant Files
- `src/app/api/calendario/eventos/route.ts` — rota a corrigir
- `src/db/schema.ts` — schema de `eventosAgenda` para verificar constraints
- `src/components/calendario/CalendarioProcessual.tsx` — formulário que chama a rota

### Dependent Files
- `src/components/calendario/CalendarioProcessual.tsx` — exibe a mensagem de erro retornada pela API

### Related ADRs
Nenhum ADR específico para esta tarefa.

## Deliverables
- `src/app/api/calendario/eventos/route.ts` modificado com log e mensagens descritivas
- Causa raiz do erro 500 identificada e corrigida
- Testes unitários e de integração **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [x] POST com `titulo` vazio retorna 400 com mensagem "O título do evento é obrigatório."
  - [x] POST com `data` no formato inválido (ex.: `"25/08/2026"`) retorna 400 com mensagem descritiva de data
  - [x] POST sem `titulo` no body retorna 400
  - [x] POST com body válido (`titulo`, `data` em YYYY-MM-DD) retorna 201 com evento criado
- Testes de integração:
  - [x] POST com body válido persiste evento em `eventosAgenda` e retorna o objeto criado
  - [x] POST com sessão inválida retorna 401 (não 500)
  - [x] POST que causa erro de DB retorna 500 com "Não foi possível salvar o evento. Tente novamente." (não "Erro interno")
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Nenhum "Erro interno" exibido ao usuário após o fix
- Causa raiz do 500 documentada em comentário no código ou no commit message
