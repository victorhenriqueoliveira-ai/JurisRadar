# Contexto — task_17

## Dependências integradas

- **task_03 ✅:** requireOrgContext, auth com orgId no JWT.
- **task_04 ✅:** Layout `(app)` criado. Sidebar com item "Busca" apontando para `/app/busca`.

## Requisitos

Adaptar busca existente ao SaaS. Migrar rotas. Adicionar org_id ao histórico. Favoritos. Botão "Adicionar ao CRM".

## Estrutura existente (LER ANTES)

- `src/app/(protected)/search/page.tsx` — busca DataJud
- `src/app/(protected)/dje/page.tsx` — busca DJe
- `src/app/(protected)/djen-nacional/page.tsx` — busca PJe
- `src/app/api/datajud-search/route.ts` — salva em `searches`
- `src/app/api/dje-search/route.ts` — salva em `djeSearches`

## O que implementar

### 1. Hub de busca `src/app/(app)/busca/page.tsx`
Tabs: DataJud, DJe TJSP, PJe Nacional
Cada aba: incorporar o componente da busca existente (ou link para sub-rota)

### 2. Sub-rotas de busca
- `src/app/(app)/busca/datajud/page.tsx` — cópia/adaptação de `(protected)/search/page.tsx`
- `src/app/(app)/busca/dje/page.tsx` — cópia/adaptação de `(protected)/dje/page.tsx`
- `src/app/(app)/busca/pje/page.tsx` — cópia/adaptação de `(protected)/djen-nacional/page.tsx`

**NÃO deletar** as rotas `(protected)/` existentes — manter para compatibilidade.

### 3. Adicionar org_id ao histórico

Em `src/app/api/datajud-search/route.ts` e `src/app/api/dje-search/route.ts`:
- Chamar `auth()` para obter orgId
- Incluir `orgId` ao inserir em `searches`/`djeSearches`
- Limitar histórico a 50 entradas por usuário (deletar mais antigas se necessário)

### 4. Favoritos

Criar tabela simples de favoritos (pode ser adicionada ao schema ou usar localStorage para v1):
- Opção mais simples: usar `localStorage` para salvar favoritos no browser (sem tabela extra)
- Ou criar `src/app/api/busca/favoritos/route.ts` com GET/POST/DELETE usando `searches` com flag `favorito: boolean`

### 5. `src/components/busca/BotaoAdicionarCRM.tsx`
Client component. Props: `{ numeroCnj: string, tribunal?: string }`.
- Verificar se processo já existe via `GET /api/processos?q={numeroCnj}`
- Se sim: exibir "(já monitorado)"
- Se não: botão "Adicionar ao CRM" que faz POST para `/api/processos/sync` ou cria processo diretamente

## Arquivos a criar

- `src/app/(app)/busca/page.tsx`
- `src/app/(app)/busca/datajud/page.tsx`
- `src/app/(app)/busca/dje/page.tsx`
- `src/app/(app)/busca/pje/page.tsx`
- `src/components/busca/BotaoAdicionarCRM.tsx`
- `src/app/api/busca/favoritos/route.ts` (opcional, ou usar localStorage)
- Testes em `src/components/busca/__tests__/`

## Testes: ≥80% cobertura
