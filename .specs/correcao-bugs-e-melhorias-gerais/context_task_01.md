# Contexto — task_01

## Requisitos do PRD (relevantes)
- Filtros e ordenação do CRM 100% funcionais: parâmetros enviados pelo frontend devem ser respeitados pelos dados retornados.
- A ordenação selecionada (coluna + direção asc/desc) deve ser aplicada na consulta retornada.
- O cabeçalho da coluna ativa deve exibir indicador visual de direção.

## Especificação Técnica (relevante)

### Core Interfaces
```typescript
type SortableColumn = 'numeroCnj' | 'tribunal' | 'areaDireito'
  | 'status' | 'ultimaMovimentacao' | 'createdAt';

interface ProcessoFilters {
  status?: string;
  area?: string;
  tribunal?: string;
  responsavel_id?: string;
  q?: string;
  cursor?: string;
  limit?: number;
  sort?: SortableColumn;   // novo
  order?: 'asc' | 'desc'; // novo
}
```

### Código atual problemático (src/services/processos.ts ~linha 89)
A query Drizzle usa `.orderBy(desc(processos.createdAt))` hardcoded — deve ser substituído por expressão dinâmica baseada em mapa de colunas com whitelist.

### Whitelist de colunas sortáveis
`numeroCnj`, `tribunal`, `areaDireito`, `status`, `ultimaMovimentacao`, `createdAt`
NÃO incluir: `proximoPrazo`, `responsavelNome` (ADR-002 — calculados no frontend)

### Fallback obrigatório
Quando `sort` ausente, inválido ou fora da whitelist → usar `desc(processos.createdAt)`

## Estado de dependências
Nenhuma dependência. Esta é uma task da Onda 1.
