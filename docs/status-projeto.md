# JurisRadar SaaS — Status do Projeto

> Gerado em: Agosto 2026
> Branch: `orchestrator/jurisradar-saas`
> Base: `orchestrator/monitoramento-dje-tjsp`

---

## Números gerais

| Item | Quantidade |
|------|-----------|
| Tasks implementadas | 20 / 20 |
| Commits na branch SaaS | 74 |
| Arquivos de código-fonte | 151 |
| Rotas de API | 34 |
| Páginas do app | 15 |
| Componentes React | 52 |
| Funções Inngest (jobs) | 5 |
| Templates de e-mail | 6 |
| Migrations de banco | 7 |
| Arquivos de teste | 44 |
| Linhas de teste | ~11.000 |

---

## O que foi feito e está funcionando

### Banco de dados (17 tabelas)

| Tabela | O que guarda |
|--------|-------------|
| `users` | Usuários com CPF, OAB, 2FA, preferências de notificação |
| `organizations` | Escritórios (multi-tenant) |
| `org_members` | Membros do escritório com papel (sócio/associado/estagiário) |
| `subscriptions` | Assinaturas Stripe por organização |
| `processos` | CRM de processos com status, área, responsável |
| `movimentacoes` | Histórico de movimentações por processo |
| `notas_processo` | Notas internas por processo |
| `notificacoes` | Notificações in-app com flag de lida |
| `honorarios` | Honorários por processo |
| `pagamentos` | Parcelas de pagamento de honorário |
| `eventos_calendario` | Eventos/prazos com flags T-5/T-2/T-1 |
| `searches` / `search_results` | Histórico de buscas por organização |
| `search_cache` | Cache de resultados de busca |
| `dje_editions` / `dje_publications` / `dje_searches` | DJE indexado |

---

### Autenticação (`/login`)

- Login por e-mail + senha
- Login por CPF e OAB (campos adicionais no cadastro)
- Organizations: cada advogado pertence a um escritório (`org_id`)
- Papéis: sócio, associado, estagiário — com controle de acesso por papel
- 2FA com TOTP (QR code + código de 6 dígitos)
- JWT com `orgId`, `papel` e `subscriptionStatus` embutidos
- Middleware protege todas as rotas automaticamente:
  - Sem login → redireciona para `/login`
  - Sem `orgId` → redireciona para `/onboarding`
  - Sem assinatura ativa → redireciona para `/billing`

---

### Onboarding (`/onboarding`)

- Wizard de 3 passos: dados do escritório → importação de processos → tour do dashboard
- Tour interativo com highlight dos elementos principais
- Ao completar, persiste `onboarding_completed_at` e cria o `org_id` do usuário

---

### Billing — Stripe (`/billing`, `/configuracoes/billing`)

- Checkout para planos Mensal (R$ 157) e Anual (R$ 127/mês)
- Webhook idempotente que sincroniza status da assinatura
- Stripe Customer Portal para o advogado gerenciar/cancelar sozinho
- `TrialBanner` no topo do app durante período trial
- Middleware bloqueia acesso ao app se assinatura expirar

---

### Importação de processos — Inngest (`/api/processos/sync`)

- Worker Inngest `sync-processos-worker` que busca processos no DataJud CNJ
- Scheduler `sync-processos-scheduler` com cron diário
- Upsert idempotente de processos e movimentações
- Suporte a PJe/Comunica para intimações em tempo real
- Após sync, emite `notificacao/nova` para movimentações relevantes

---

### CRM de processos (`/crm`)

- Tabela com paginação, ordenação e filtros (status, área, responsável, período)
- `ProcessoSheet` — painel lateral com abas:
  - **Detalhes:** dados do processo, tribunal, número CNJ
  - **Movimentações:** timeline completa
  - **Notas:** adicionar/remover anotações internas
  - **Financeiro:** honorários e pagamentos do processo
- Arquivamento e atualização de processos
- 34 APIs REST com isolamento por `org_id`

---

### Notificações (`/notificacoes`)

- Persistência no banco (`notificacoes` table)
- Sino no header com badge de contagem (polling a cada 30 segundos)
- Painel lateral `NotificacoesSheet` com lista e marcar como lida
- Página `/notificacoes` com histórico completo
- Marcar todas como lidas de uma vez
- Tipos: intimação, citação, decisão, sentença, publicação DJE, prazo iminente

---

### Notificações por e-mail — Inngest

Função `notificacao-dispatcher` (Inngest) que:
- Recebe evento `notificacao/nova`
- Verifica idempotência (não reenvia a mesma notificação)
- Persiste a notificação in-app
- Respeita preferências do usuário (canal desativado por tipo)
- Envia e-mail via Resend com o template correto

**Templates de e-mail:**
| Template | Quando é enviado |
|----------|-----------------|
| `NotificacaoIntimacao.tsx` | Nova intimação ou citação |
| `AlertaPrazo.tsx` | Prazo em 5, 2 ou 1 dias |
| `ResumoDiario.tsx` | Resumo diário (movimentações + prazos) |
| `WelcomeOnboarding.tsx` | Boas-vindas ao criar conta |
| `ConviteMembro.tsx` | Convite para novo membro do escritório |
| `FalhaBilling.tsx` | Falha no pagamento da assinatura |

---

### Alertas de prazo — Inngest (`alertas-prazo`)

- Cron diário às 8h (horário de Brasília)
- Verifica `eventos_calendario` nos marcos T-5, T-2 e T-1 dias
- Filtra processos arquivados automaticamente
- Idempotência via flags `alertado_t5`, `alertado_t2`, `alertado_t1` no banco
- Emite `notificacao/nova` para o dispatcher (nunca envia e-mail diretamente)

---

### Dashboard analítico (`/dashboard`)

- 4 KPI cards: processos ativos, urgência alta, prazos em 7 dias, intimações não lidas
- Gráfico de pizza: distribuição por status (ativo/suspenso/encerrado)
- Gráfico de barras: distribuição por área do direito
- Gráfico de linha: evolução mensal (últimos 6 meses)
- Lista dos 5 prazos mais urgentes com link direto para o processo
- Timeline das 10 movimentações mais recentes
- Filtro pessoal vs. escritório (sócio vê todo o escritório)

---

### Calendário processual (`/calendario`)

- Visualizações: mês, semana e agenda
- Cores por tipo de evento (audiência, prazo, intimação) e urgência
- Clique no evento abre o `ProcessoSheet` do processo relacionado
- Swipe mobile para navegar entre períodos
- Export iCal (`.ics` RFC 5545) — compatível com Google Agenda, Apple Calendar, Outlook

---

### Módulo financeiro (`/financeiro`)

- Dashboard com 3 KPIs: total a receber, total recebido, em atraso
- Tabela de honorários com filtros de status (pendente/parcial/quitado) e período
- Formulário de honorário por processo (valor, vencimento, descrição)
- Lista de pagamentos por honorário com cálculo automático de status
- Soft delete de honorários (nunca apaga do banco)
- Aba "Financeiro" integrada no `ProcessoSheet` do CRM

---

### Busca de processos (`/busca`)

- **DataJud CNJ:** busca por número CNJ, nome da parte, advogado — com histórico por escritório
- **DJE:** busca no Diário da Justiça Eletrônico com filtros avançados
- **PJe/Comunica:** intimações via portal do PJe
- Favoritos salvos por organização
- Botão "Adicionar ao CRM" nos resultados de busca
- Histórico de buscas acessível a qualquer membro do escritório

---

### Gestão do escritório (`/configuracoes/escritorio`)

- Editar dados do escritório (nome, CNPJ, área de atuação)
- Tabela de membros com papel inline editável
- Convidar novo membro por e-mail (gera token de convite + envia e-mail)
- Remover membros (sócio único não pode se remover)
- Controle de acesso: apenas sócio pode mutar membros

---

### Inngest — Jobs registrados

| Função | Trigger | O que faz |
|--------|---------|-----------|
| `dje-indexer` | Cron | Indexa publicações do DJE |
| `sync-processos-scheduler` | Cron diário | Dispara sync por organização |
| `sync-processos-worker` | Evento | Busca processos no DataJud, faz upsert |
| `notificacao-dispatcher` | `notificacao/nova` | Persiste in-app + envia e-mail |
| `alertas-prazo` | Cron 8h | Verifica T-5/T-2/T-1 e emite alertas |

---

## O que NÃO foi implementado (fora de escopo)

Itens que foram deliberadamente deixados de fora (não estão no PRD/TechSpec):

- **NFS-e / contabilidade / DRE** — módulo financeiro cobre só honorários
- **Assinatura digital de documentos** — não planejado
- **Chat interno entre membros** — não planejado
- **App mobile nativo** — o app é responsivo mas não há app React Native/Flutter
- **Integração com sistemas de tribunais estaduais além de DJE/PJe** — apenas os que já estavam na base
- **Multi-idioma** — apenas português brasileiro
- **IA/assistente jurídico** — não planejado nesta fase
- **Exportação de relatórios em PDF** — somente iCal está implementado

---

## O que ainda precisa ser feito antes de ir para produção

### Crítico (bloqueia o lançamento)

- [ ] **Variáveis de ambiente de produção** — configurar Stripe, Resend e Inngest com chaves reais (não as de teste/dev)
- [ ] **Domínio e DNS** — apontar domínio para Vercel/servidor e configurar certificado SSL
- [ ] **`NEXT_PUBLIC_APP_URL`** — adicionar ao `.env.local` (e ao ambiente de produção)
- [ ] **Produtos Stripe** — criar os dois preços no dashboard Stripe e preencher `STRIPE_PRICE_MONTHLY` e `STRIPE_PRICE_ANNUAL`
- [ ] **Domínio verificado no Resend** — sem isso e-mails caem no spam ou não saem
- [ ] **Testar o fluxo de onboarding** — criar conta → escritório → importar processos → ver dashboard
- [ ] **Testar o fluxo de billing** — checkout → webhook → acesso liberado → Customer Portal → cancelamento

### Importante (deve ser feito cedo)

- [ ] **Seed de produção** — remover ou proteger o script de seed para não recriar admin em produção
- [ ] **Rate limiting nas APIs** — qualquer endpoint público pode ser abusado sem isso
- [ ] **Logs e monitoramento** — integrar Sentry ou similar para capturar erros em produção
- [ ] **Testes de integração reais** — os testes atuais usam mocks; validar com banco real antes do launch
- [ ] **Revisar a migration `0004_backfill_existing_users.sql`** — conflito de nome com `0004_onboarding_completed_at.sql`, verificar qual aplica primeiro

### Melhorias pós-launch

- [ ] Página de preços pública (landing page)
- [ ] Recuperação de senha por e-mail
- [ ] Página de convite (`/convite?token=...`) para novos membros completarem o cadastro
- [ ] Resumo diário por e-mail (o template existe, falta o cron que o dispara)
- [ ] Preferências de notificação na UI (hoje o campo `notification_prefs` existe no banco mas não há tela)
- [ ] Paginação no calendário (hoje carrega todos os eventos do período de uma vez)
- [ ] Busca full-text nos processos do CRM (hoje é filtro por campos exatos)
- [ ] Exportação do CRM em CSV/Excel

---

## Estrutura de arquivos relevante

```
src/
├── app/
│   ├── (app)/           # Rotas protegidas (requer login + org + assinatura)
│   │   ├── busca/
│   │   ├── calendario/
│   │   ├── configuracoes/
│   │   ├── crm/
│   │   ├── dashboard/
│   │   ├── financeiro/
│   │   └── notificacoes/
│   ├── (auth)/login/
│   ├── (onboarding)/
│   ├── (public)/billing/
│   └── api/             # 34 rotas REST
├── components/
│   ├── busca/
│   ├── calendario/
│   ├── configuracoes/
│   ├── crm/
│   ├── dashboard/
│   ├── financeiro/
│   ├── layout/          # AppHeader, Sidebar, NotificacoesSheet
│   ├── onboarding/
│   └── ui-custom/       # Design tokens JurisRadar
├── db/
│   ├── schema.ts        # 17 tabelas Drizzle
│   └── migrations/      # 7 migrations SQL
├── inngest/             # 5 funções de job
├── lib/
│   ├── email/templates/ # 6 templates React Email
│   ├── notificacoes/
│   ├── org-context.ts   # requireOrgContext() — multi-tenancy
│   └── stripe.ts
└── services/            # Camada de serviço (processos, financeiro, dashboard, calendário, notificações)
```
