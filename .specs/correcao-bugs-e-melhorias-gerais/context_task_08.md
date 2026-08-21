# Contexto — task_08

## Requisitos do PRD (relevantes)
- Dashboard atualiza dados automaticamente em até 30s após sync OAB sem ação do usuário.
- Botão "Sincronizar agora" com estado de carregamento e timestamp do último sync.
- Auto-refresh usando polling de 30s com aba em foco (ADR-001, ADR-003).

## Especificação Técnica (relevante)

### Arquivo a criar
`src/app/api/dashboard/summary/route.ts`

### Shape do response (DashboardSummaryResponse)
```typescript
interface DashboardSummaryResponse {
  totalAtivos: number;
  urgenciaAlta: number;
  prazos7Dias: number;
  intimacoesNaoLidas: number;
  distribuicaoStatus: { status: string; count: number }[];
  distribuicaoArea: { area: string; count: number }[];
  prazosUrgentes: { processoId: string; numeroCnj: string;
                    titulo: string; data: string; diasRestantes: number }[];
  movimentacoesRecentes: { processoId: string; numeroCnj: string;
                           tipo: string; descricao: string; dataHora: string }[];
  lastSyncAt: string | null; // ISO timestamp do último sync OAB da org
}
```

### Services a reutilizar
- `aggregateDashboard()` de `src/services/dashboard.ts`
- `getPrazosUrgentes()` de `src/services/dashboard.ts`
- `requireOrgContext()` para isolamento multi-tenant

### `lastSyncAt`
Buscar `MAX(ultimaSyncAt)` da tabela `processos` filtrada por `orgId`. Campo `ultimaSyncAt` existe em `processos`.

### Códigos de status
- 200 OK com DashboardSummaryResponse
- 401 sem sessão
- 403 scope=escritorio sem role='socio'

### Cache
`next: { revalidate: 15 }` para reduzir carga no banco.

### Execução
`Promise.all([aggregateDashboard(...), getPrazosUrgentes(...)])` para paralelismo.

## Estado de dependências
Nenhuma dependência. Onda 1B. task_09 e task_10 dependem desta.
