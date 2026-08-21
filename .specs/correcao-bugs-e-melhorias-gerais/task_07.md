---
status: completed
title: Botão "Ver no DJEN" no CRM
type: frontend
complexity: low
dependencies: []
---

# Task 07: Botão "Ver no DJEN" no CRM

## Overview
O CRM não oferece atalho para acessar a publicação de um processo no DJEN Nacional. Esta tarefa adiciona um link/botão "Ver no DJEN" em cada linha da tabela do CRM, abrindo em nova aba a busca do portal DJEN Nacional pré-preenchida com o número do processo.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar botão ou ícone "Ver no DJEN" em cada linha da `ProcessoTable`
- DEVE abrir em nova aba (`target="_blank" rel="noopener noreferrer"`)
- DEVE pré-preencher o número do processo (CNJ) na URL do portal DJEN Nacional
- A URL base DEVE ser parametrizável via `NEXT_PUBLIC_DJEN_PORTAL_URL` (ver TechSpec > Integration Points)
- DEVE verificar e documentar a URL exata do portal DJEN Nacional antes de implementar
- NÃO DEVE bloquear o fluxo do usuário no CRM ao clicar no link
</requirements>

## Subtasks
- [x] 7.1 Verificar a URL exata do portal DJEN Nacional para busca por número de processo
- [x] 7.2 Adicionar variável `NEXT_PUBLIC_DJEN_PORTAL_URL` ao `.env.local` e `.env.example`
- [x] 7.3 Adicionar coluna ou ícone "Ver no DJEN" em `ProcessoTable` com o link formatado
- [x] 7.4 Garantir `target="_blank" rel="noopener noreferrer"` no link
- [x] 7.5 Escrever testes para a geração correta da URL

## Implementation Details
Arquivo a modificar: `src/components/crm/ProcessoTable.tsx`

Ver TechSpec > Integration Points > "DJEN Nacional — link externo do CRM" para o formato da URL e a instrução de verificação antes de implementar.

URL esperada (verificar no portal antes de codificar):
`${NEXT_PUBLIC_DJEN_PORTAL_URL}?numero={numeroCNJ}`

### Relevant Files
- `src/components/crm/ProcessoTable.tsx` — tabela a modificar com o novo link
- `.env.local` — adicionar `NEXT_PUBLIC_DJEN_PORTAL_URL`
- `src/components/crm/ProcessoCard.tsx` — verificar se também exibe processo e precisa do link

### Dependent Files
Nenhum arquivo depende desta tarefa.

### Related ADRs
Nenhum ADR específico para esta tarefa.

## Deliverables
- `src/components/crm/ProcessoTable.tsx` com botão "Ver no DJEN"
- Variável `NEXT_PUBLIC_DJEN_PORTAL_URL` documentada no `.env.example`
- Testes unitários **(OBRIGATÓRIO)**

## Tests
- Testes unitários:
  - [x] Dado processo com `numeroCnj = '1234567-89.2026.8.26.0000'`, o link gerado contém o número formatado corretamente
  - [x] Link tem `target="_blank"` e `rel="noopener noreferrer"`
  - [x] Sem `NEXT_PUBLIC_DJEN_PORTAL_URL` definida, componente não lança erro (usar URL padrão de fallback)
- Testes de integração:
  - [x] Renderizar `ProcessoTable` com um processo e verificar que o link "Ver no DJEN" está presente no DOM
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria
- Todos os testes passando
- Cobertura de testes >=80%
- Clicar em "Ver no DJEN" abre nova aba com a busca pré-preenchida no portal correto
