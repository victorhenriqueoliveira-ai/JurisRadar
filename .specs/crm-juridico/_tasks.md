# CRM Jurídico — Lista de Tarefas

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Migrations de Schema — 4 novas tabelas e colunas | completed | critical | — |
| 02 | AsaasClient — Cliente HTTP com sub-conta, cobranças e assinaturas | completed | high | task_01 |
| 03 | ZenviaClient — Cliente HTTP para SMS e WhatsApp Business | completed | medium | — |
| 04 | StorageClient — Adaptador Vercel Blob com validação | completed | low | — |
| 05 | API Asaas — Conexão, cobranças e assinaturas | completed | high | task_01, task_02 |
| 06 | Webhook Asaas — Reconciliação de pagamentos | completed | medium | task_01, task_02, task_05 |
| 07 | API Asaas — Inadimplentes e reenvio de cobrança | completed | medium | task_01, task_02, task_05 |
| 08 | API Anexos — Upload, listagem e exclusão via Vercel Blob | completed | medium | task_01, task_04 |
| 09 | Modificar notificacaoDispatcher — Iniciar state machine de garantia | completed | medium | task_01, task_03 |
| 10 | garantiaIntimacaoEscalador — Inngest com step.sleep e escalação | completed | high | task_01, task_03, task_09 |
| 11 | API Confirmar Ciência + Cron de Fallback da Garantia | completed | medium | task_01, task_09, task_10 |
| 12 | Frontend — Hub Financeiro Asaas (formulários e relatórios) | completed | high | task_05, task_06, task_07 |
| 13 | Frontend — Aba Anexos no painel do processo | completed | medium | task_08 |
| 14 | Frontend — Botão Confirmar Ciência e indicador de garantia | completed | medium | task_11 |
| 15 | Frontend — Onboarding Asaas e campo WhatsApp | completed | high | task_05, task_12, task_14 |
| 16 | Schema v2 — tabelas clientes, comunicacoes_cliente, view v_eventos_calendario e colunas em eventos | completed | critical | — |
| 17 | Atualizar resolverCorEvento — modelo híbrido tipo + urgência | completed | low | — |
| 18 | Templates de comunicação com cliente — buildWaLink + NotificacaoCliente.tsx | completed | medium | — |
| 19 | ComunicacaoClienteService + API /api/comunicacoes/* e /api/clientes | completed | high | task_16, task_18 |
| 20 | calendarioAutoEventCreator — Inngest function de auto-criação de eventos via DJE/DJEN | completed | medium | task_16 |
| 21 | API Calendário — endpoints GET/POST/PUT/DELETE com validação de drag em prazo fatal | completed | high | task_16, task_17 |
| 22 | Frontend Calendário — DnD addon, Tooltip hover e modo Foco do dia | completed | high | task_17, task_21 |
| 23 | Frontend CRM — Aba Comunicações no painel do processo | completed | high | task_16, task_19 |
