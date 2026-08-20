---
status: pending
title: Frontend — Painel de Busca e Resultados
type: frontend
complexity: high
dependencies:
  - task_02
  - task_05
---

# Task 07: Frontend — Painel de Busca e Resultados

## Overview

Implementa a tela principal do JurisRadar: painel de filtros extensível, submissão da busca, polling de progresso, lista de resultados paginada com indicador de tribunais com falha, botão de exportação CSV e todos os estados de interface obrigatórios (em andamento, sem resultados, erro geral, resultado parcial). Esta é a tela que valida o fluxo central do MVP.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar a página `/search` em `src/app/(protected)/search/page.tsx` acessível apenas para usuários autenticados (protegida pelo middleware da task_02).
- DEVE implementar o painel de filtros usando React Hook Form + Zod (`SearchFiltersSchema` da task_05) com shadcn/ui: campos para assunto (multi-valor), grau (select), período (date pickers), busca livre (input de texto).
- DEVE implementar o hook `useSearchStatus(searchId: string | null)` em `src/hooks/useSearchStatus.ts` que faz polling a cada 3 segundos para `GET /api/searches/[id]` enquanto o status for `pending` ou `processing`, e para o polling quando o status for terminal (`completed`, `partial`, `failed`).
- DEVE exibir indicador de progresso com o texto "N de 90 tribunais consultados" baseado no comprimento de `processedTribunals`.
- DEVE exibir lista paginada de resultados com colunas: número CNJ, classe/assunto, tribunal, grau, órgão julgador, data de distribuição, partes, última movimentação.
- DEVE exibir aviso fixo próximo aos resultados: "Os dados provêm do DataJud (CNJ) e podem ter até 7 dias de defasagem."
- DEVE exibir lista de tribunais que falharam quando `failedTribunals.length > 0`.
- DEVE exibir estado de "sem resultados" (mensagem distinta de lista vazia) quando `totalResults === 0` e status for terminal.
- DEVE exibir estado de erro geral quando `status === 'failed'`.
- DEVE exibir botão "Exportar CSV" quando `totalResults > 0` e o status for `completed` ou `partial`.
- DEVE exibir botão "Salvar busca" que abre modal para nomear a busca (o registro já é criado automaticamente — "salvar" pode apenas associar um nome ao registro existente via PATCH ou o nome é fornecido no `POST` inicial).
- A estrutura do painel de filtros DEVE ser extensível: adicionar um novo filtro não deve exigir mudanças fora do componente de filtros.
- NÃO DEVE fazer polling mais de 1 vez a cada 3 segundos, mesmo que o componente re-renderize.
</requirements>

## Subtasks

- [ ] 7.1 Criar layout do grupo de rotas protegidas `src/app/(protected)/layout.tsx`
- [ ] 7.2 Criar `src/app/(protected)/search/page.tsx` com painel de filtros (React Hook Form + Zod + shadcn/ui)
- [ ] 7.3 Criar `src/hooks/useSearchStatus.ts` com lógica de polling e cleanup no unmount
- [ ] 7.4 Criar componente `SearchResults` com lista paginada e colunas de dados
- [ ] 7.5 Implementar indicador de progresso (N/90 tribunais consultados)
- [ ] 7.6 Implementar todos os estados de interface: em_andamento, sem_resultados, com_falhas_parciais, erro_geral
- [ ] 7.7 Implementar botão "Exportar CSV" acionando `GET /api/searches/[id]/export`
- [ ] 7.8 Implementar aviso de defasagem de dados do DataJud em posição de destaque

## Implementation Details

Consulte a seção **"Experiência do Usuário — Estados de interface obrigatórios"** do PRD para a lista completa de estados que a interface deve cobrir.

Consulte a seção **"Technical Considerations — Polling vs. WebSocket"** do TechSpec para a justificativa do polling a 3s e o impacto esperado de ~20 req/min por usuário ativo.

Estrutura esperada:

```
src/
  app/(protected)/
    layout.tsx                 ← layout protegido (header, nav)
    search/
      page.tsx                 ← página principal
  hooks/
    useSearchStatus.ts         ← polling hook
  components/
    search/
      FilterPanel.tsx          ← painel de filtros extensível
      SearchResults.tsx        ← lista paginada de resultados
      ProgressIndicator.tsx    ← N/90 tribunais
      FailedTribunalsWarning.tsx
```

### Relevant Files

- `src/app/(protected)/search/page.tsx` — tela principal
- `src/hooks/useSearchStatus.ts` — hook de polling
- `src/components/search/FilterPanel.tsx` — painel de filtros
- `src/components/search/SearchResults.tsx` — lista de resultados

### Dependent Files

- `src/app/(protected)/history/page.tsx` (task_08) — reutiliza `SearchResults` e o botão de exportação
- `src/lib/validations.ts` (task_05) — `SearchFiltersSchema` compartilhado com o formulário frontend

### Related ADRs

- [ADR-001: Estratégia do MVP — Busca Nacional Assíncrona](adrs/adr-001.md) — define que o frontend deve exibir resultados parciais e progresso durante o processamento assíncrono

## Deliverables

- Página `/search` funcional com painel de filtros, resultados e todos os estados
- Hook `useSearchStatus` com polling controlado e cleanup
- Componentes `FilterPanel`, `SearchResults`, `ProgressIndicator`
- Botão "Exportar CSV" funcional
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração do fluxo de busca no frontend **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `useSearchStatus(null)` não dispara nenhum fetch
  - [ ] `useSearchStatus('id-valido')` inicia polling a cada 3s e chama `fetch('/api/searches/id-valido')` repetidamente
  - [ ] `useSearchStatus` para o polling quando status retornado é `completed`
  - [ ] `useSearchStatus` para o polling quando status retornado é `partial`
  - [ ] `useSearchStatus` cancela o interval no unmount do componente
  - [ ] `FilterPanel` com todos os campos vazios e submit mostra erro de validação (ao menos um filtro obrigatório)
  - [ ] `ProgressIndicator` com `processedTribunals: ['TJSP', 'TRF3']` e `totalTribunals: 90` exibe "2 de 90 tribunais consultados"
  - [ ] `SearchResults` com `results: []` e `status: 'completed'` exibe estado de "sem resultados"
  - [ ] `SearchResults` com `failedTribunals: ['TJAL']` exibe aviso de tribunal com falha
- Testes de integração:
  - [ ] Fluxo completo: preencher filtros → submeter → aguardar polling indicar `completed` → ver resultados → clicar "Exportar CSV" → download iniciado
  - [ ] Submeter busca com formulário vazio não dispara `POST /api/searches`
  - [ ] Navegação para `/search` sem sessão redireciona para `/login`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Fluxo completo executável: login → filtrar → buscar → ver progresso → ver resultados → exportar CSV
- Estado de "N de 90 tribunais consultados" atualiza visivelmente durante o processamento
- Aviso de defasagem de dados visível em todas as telas de resultado
- Polling não gera múltiplas requisições simultâneas ao mesmo endpoint
