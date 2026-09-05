---
status: completed
title: Frontend CRM — Aba Comunicações no painel do processo
type: frontend
complexity: high
dependencies:
  - task_16
  - task_19
---

# Task 23: Frontend CRM — Aba Comunicações no painel do processo

## Overview

Adiciona a aba "Comunicações" ao painel lateral do processo (`ProcessoSheet.tsx`), onde o advogado pode ver o histórico de mensagens enviadas ao cliente e iniciar novas notificações via WhatsApp ou e-mail com template pré-preenchido e editável. Fecha o ciclo do CRM como hub central do PRD v2.0.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- 1. DEVE adicionar aba "Comunicações" em `ProcessoSheet.tsx` que carrega histórico via `GET /api/processos/[id]/comunicacoes`.
- 2. O histórico DEVE exibir para cada mensagem: canal (ícone WhatsApp ou E-mail), data/hora, trecho da mensagem e nome do advogado que enviou.
- 3. DEVE ter botão "Notificar Cliente" que abre modal com: seletor de canal (WhatsApp | E-mail), campo de mensagem pré-preenchido com dados do processo (número CNJ, tipo de movimentação mais recente, data) e editável pelo advogado.
- 4. Ao confirmar envio por E-mail: chamar `POST /api/comunicacoes/email` e exibir toast de sucesso/erro.
- 5. Ao confirmar envio por WhatsApp: chamar `POST /api/comunicacoes/whatsapp-link`, abrir URL wa.me em nova aba e exibir toast confirmando que o link foi aberto.
- 6. Após envio bem-sucedido: atualizar a lista de histórico sem reload da página (revalidar query).
- 7. DEVE exibir estado de carregamento enquanto busca histórico e estado vazio quando não há comunicações.
- 8. O modal DEVE ser fechado com Escape ou clique fora.
</requirements>

## Subtasks

- [x] 23.1 Adicionar aba "Comunicações" na estrutura de tabs de `ProcessoSheet.tsx`
- [x] 23.2 Criar componente de listagem do histórico com ícones de canal e dados da mensagem
- [x] 23.3 Criar modal "Notificar Cliente" com seletor de canal e campo de mensagem editável
- [x] 23.4 Implementar lógica de envio por e-mail (POST + toast) e WhatsApp (POST + window.open + toast)
- [x] 23.5 Implementar revalidação do histórico após envio bem-sucedido
- [x] 23.6 Adicionar estados de carregamento e vazio

## Implementation Details

Ver seções "Features Principais — CRM de Processos — Hub Central" e "API Endpoints — Comunicação com Cliente" do TechSpec v2.0 e PRD v2.0. O componente `ProcessoSheet.tsx` já tem tabs (Movimentações, Notas, Arquivos) — adicionar aba "Comunicações" seguindo o mesmo padrão.

O template pré-preenchido deve interpolar dados disponíveis no contexto do processo (número CNJ, última movimentação, data) — os dados já estão disponíveis no estado do componente `ProcessoSheet`. O modal pode ser implementado com Radix UI `Dialog` (já usado no projeto).

### Relevant Files

- `src/components/crm/ProcessoSheet.tsx` — componente principal a modificar
- `src/components/crm/MovimentacaoTimeline.tsx` — referência de padrão de listagem com dados do processo
- `src/components/crm/NotasList.tsx` — referência de padrão de aba com listagem + ação
- `src/app/(app)/crm/page.tsx` — página do CRM que renderiza ProcessoSheet

### Dependent Files

- `src/components/financeiro/RelatorioInadimplentes.tsx` — também usará os endpoints de comunicação (botão "Notificar" no relatório de inadimplentes) — pode reusar o modal criado aqui

### Related ADRs

- [ADR-007: Estrutura de Produto — CRM como Hub Central](../adrs/adr-007.md) — justifica a aba Comunicações como parte central do painel do processo
- [ADR-009: Modelo de Dados de Cliente — Tabela Normalizada](../adrs/adr-009.md) — histórico persistido em `comunicacoes_cliente`

## Deliverables

- Aba "Comunicações" funcional em `ProcessoSheet.tsx`
- Modal "Notificar Cliente" com template editável e envio por WhatsApp e e-mail
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração (render + interação do modal) **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Aba "Comunicações" renderiza lista de histórico com ícone correto para `canal='whatsapp'` e `canal='email'`
  - [ ] Estado vazio exibe mensagem "Nenhuma comunicação enviada ainda" quando histórico está vazio
  - [ ] Modal "Notificar Cliente" abre ao clicar em "Notificar Cliente" e fecha com Escape
  - [ ] Seleção de canal "WhatsApp" exibe campo de mensagem pré-preenchido com número CNJ do processo
  - [ ] Seleção de canal "E-mail" exibe campo de assunto e corpo pré-preenchidos
  - [ ] Clique em "Enviar" com canal E-mail chama `POST /api/comunicacoes/email` e exibe toast de sucesso
  - [ ] Clique em "Enviar" com canal WhatsApp chama `POST /api/comunicacoes/whatsapp-link`, chama `window.open` com URL wa.me e exibe toast
  - [ ] Após envio bem-sucedido, nova mensagem aparece no histórico sem reload
- Testes de integração:
  - [ ] `ProcessoSheet` com processo mockado renderiza aba Comunicações sem erro
  - [ ] Fluxo completo: abrir modal → selecionar E-mail → editar mensagem → enviar → verificar nova entrada no histórico
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Histórico de comunicações visível no painel do processo com dados corretos
- Template pré-preenchido com dados reais do processo
- WhatsApp abre em nova aba com mensagem codificada corretamente
- E-mail enviado e confirmado com toast em menos de 3 segundos
