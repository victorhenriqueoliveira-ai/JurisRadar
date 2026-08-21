# Contexto — task_12

## Requisitos do PRD (relevantes)
- Rotas perceptivelmente mais rápidas: redução subjetiva de lentidão ao navegar entre páginas.
- Rotas que exibem estado de carregamento devem fazê-lo de forma consistente, evitando tela em branco.

## Especificação Técnica (relevante)

### Arquivos a criar
- `src/app/(app)/dashboard/loading.tsx`
- `src/app/(app)/crm/loading.tsx`
- `src/app/(app)/calendario/loading.tsx`

### Regras
- Skeletons devem ter estrutura visual similar à tela real (mesma quantidade de cards/colunas)
- Usar animação de pulse (Tailwind `animate-pulse` ou equivalente já usado no projeto)
- NÃO importar dados reais ou fazer fetch nos arquivos `loading.tsx`
- Componentes puros sem estado

### Antes de criar
Verificar se há componente de skeleton reutilizável em `src/components/ui/` ou `src/components/ui-custom/`. Reutilizar padrões existentes.

### Estrutura esperada por rota
- **dashboard**: skeleton para 4 KPI cards + 2 gráficos + 2 listas
- **crm**: skeleton para barra de filtros + tabela com ~5 linhas
- **calendario**: skeleton para grade de calendário mensal

## Estado de dependências
Nenhuma dependência. Onda 1B.
