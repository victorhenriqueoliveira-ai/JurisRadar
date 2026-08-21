# Correção de Bugs Críticos e Melhorias Gerais — Lista de Tarefas

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Fix sort dinâmico em `listProcessos()` | completed | low | — |
| 02 | Fix rota `GET /api/processos` — repassar sort/order | pending | low | task_01 |
| 03 | Fix `POST /api/calendario/eventos` — erros descritivos | completed | low | — |
| 04 | Fix pós-filtragem DJEN por termo no corpo | completed | low | — |
| 05 | Fix onboarding — sync fire-and-forget | completed | low | — |
| 06 | Fix filtro urgência no CRM (frontend) | pending | low | task_02 |
| 07 | Botão "Ver no DJEN" no CRM | pending | low | — |
| 08 | Nova rota `GET /api/dashboard/summary` | pending | medium | — |
| 09 | `DashboardPoller` — client component de polling | pending | medium | task_08 |
| 10 | Integrar polling + botão sync no dashboard | pending | medium | task_08, task_09 |
| 11 | Ajustar cron Inngest OAB para 5h | pending | low | — |
| 12 | Adicionar `loading.tsx` nas rotas principais | pending | low | — |
