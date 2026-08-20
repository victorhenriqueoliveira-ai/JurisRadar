# Monitoramento DJE/TJSP — Lista de Tarefas

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Migration de banco e interfaces TypeScript | completed | medium | — |
| 02 | DJE Client — download de PDF com retry | completed | medium | task_01 |
| 03 | DJE Parser — extração e segmentação de publicações | completed | high | task_01, task_02 |
| 04 | Queries Drizzle para DJE | completed | medium | task_01 |
| 05 | Inngest job de indexação diária (cron) | completed | high | task_02, task_03, task_04 |
| 06 | API Routes de busca DJE | completed | high | task_01, task_04 |
| 07 | Frontend — Painel de busca DJE | completed | high | task_06 |
| 08 | Frontend — Histórico de buscas DJE | completed | medium | task_06, task_07 |
