# JurisRadar SaaS — Lista de Tarefas

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Design tokens e componentes uiverse.io base | completed | medium | — |
| 02 | Schema de banco: tabelas multi-tenancy e migrations | completed | critical | — |
| 03 | Auth expandido: CPF, OAB, organizations, papéis e 2FA | completed | high | task_02 |
| 04 | Layout base e sidebar responsiva | completed | medium | task_01, task_03 |
| 05 | Stripe billing: checkout, webhook e middleware de acesso | completed | high | task_02, task_03 |
| 06 | Resend: setup e templates de e-mail base | completed | low | task_03 |
| 07 | Importação automática de processos via Inngest + DataJud/PJe | completed | high | task_02, task_03, task_05 |
| 08 | CRM backend: endpoints de processos, movimentações e notas | completed | high | task_02, task_03, task_07 |
| 09 | CRM frontend: tabela, filtros e painel lateral | completed | high | task_01, task_04, task_08 |
| 10 | Notificações in-app: persistência, sino e painel | completed | high | task_02, task_03, task_08 |
| 11 | Worker de diff de movimentações e dispatch de notificações | pending | high | task_07, task_10 |
| 12 | Templates de e-mail de notificação via Resend | pending | medium | task_06, task_11 |
| 13 | Dashboard analítico: API de métricas e UI com gráficos | pending | high | task_01, task_04, task_08, task_10 |
| 14 | Calendário processual: UI, API de eventos e export iCal | pending | high | task_04, task_08, task_11 |
| 15 | Alertas de prazo via Inngest (T-5, T-2, T-1) | pending | medium | task_11, task_14 |
| 16 | Módulo financeiro: honorários e pagamentos | pending | high | task_04, task_08, task_09 |
| 17 | Busca avançada: adaptação SaaS, histórico e favoritos | completed | medium | task_03, task_04 |
| 18 | Onboarding guiado: fluxo 3 passos e tour interativo | completed | medium | task_03, task_04, task_07 |
| 19 | Stripe Customer Portal e self-service de assinatura | completed | medium | task_05 |
| 20 | Gestão de escritório e membros: convites e papéis | pending | medium | task_03, task_04, task_09 |
